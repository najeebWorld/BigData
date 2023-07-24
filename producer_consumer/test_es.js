const { Client } = require('@elastic/elasticsearch');

// Create Elasticsearch client
const client = new Client({ node: 'http://localhost:9200' });

// Define the index you want to read from
const index = 'space';

// Search and retrieve documents from the index
async function searchDocuments() {
    try {
        const response = await client.search({
            index,
            body: {
                query: {
                    match_all: {} // Retrieve all documents
                }
            }
        });

        const documents = response.hits.hits;
        console.log('Documents retrieved successfully:');
        console.log(response.hits.total.value);
        documents.forEach((doc) => {
            console.log(`Document ID: ${doc._id}, Source: ${JSON.stringify(doc._source)}`);
        });
    } catch (error) {
        console.error('Error searching documents:', error);
    }
}


async function getMessages(options) {
    const { startDate, endDate, eventType, sourceType } = options;

    // Build the base query
    const query = {
        bool: {
            must: [],
        },
    };

    // Date range query
    if (startDate && endDate && startDate !== '' && endDate !== '') {
        query.bool.must.push({
            range: {
                "date.keyword": {
                    gte: startDate + ' 00:00:00 UTC',
                    lte: endDate + ' 23:59:59 UTC',
                    format: "yyyy-MM-dd HH:mm:ss Z",
                },
            },
        });
    }

    // Event type query
    if (eventType && eventType !== 'All') {
        query.bool.must.push({
            match_phrase: {
                "event": eventType,
            },
        });
    }

    // Source type query
    if (sourceType && sourceType !== 'All') {
        query.bool.must.push({
            match_phrase: {
                "source": sourceType,
            },
        });
    }

    try {
        const response = await client.search({
            index,
            body: {
                query,
            },
        });

        console.log(`Retrieved ${response.hits.total.value} messages`);
        console.log(response.hits.total.value);
        response.hits.hits.forEach((hit) => {
            console.log(`Message: ${JSON.stringify(hit)}`);
        });
        return response.hits.hits.map((hit) => hit._source);
    } catch (error) {
        console.error('Error retrieving messages:', error);
        return [];
    }
}

async function getLast() {
    try {
        // Search for the last document in the index sorted by the timestamp field in descending order
        const body = await client.search({
            index: index,
            size: 1,
            body: {
                sort: [{ '@timestamp': 'desc' }], // Replace '@timestamp' with your timestamp field name
            },
        });
    
        // Extract the last message from the Elasticsearch response
        const lastMessage = body.hits.hits[0]._source; // Assumes that the message is stored in the '_source' field
        console.log(lastMessage);
        return lastMessage;
    } catch (error) {
        console.error('Error retrieving the last message from Elasticsearch:', error);
        return null;
    }
}

async function getRecentMessages() {
    try {
        // Search query to retrieve the most recent messages excluding the first one
        const searchQuery = {
            index: index,
            body: {
                size: 6, // 5 recent messages + 1 for the first one
                sort: [
                    { '@timestamp': { order: 'desc' } }, // Sort by timestamp in descending order
                ],
            },
        };
    
        const body = await client.search(searchQuery);
    
        // Exclude the first message from the result
        const messages = body.hits.hits.slice(1).map(hit => hit._source);
        messages.forEach((hit) => {
            console.log(`Message: ${JSON.stringify(hit)}`);
        });
        return messages;
    } catch (error) {
        console.error('Error retrieving recent messages:', error.message);
        return [];
    }
}

async function getEventCounts() {
    try {
      // Aggregation query to get counts for each event type
        const aggregationQuery = {
            index: index,
            body: {
                size: 0,
                aggs: {
                    event_counts: {
                        terms: {
                            field: 'event.keyword', // Assuming the event field is not analyzed
                            size: 5, // The number of different event types
                        },
                    },
                },
            },
        };

        const body = await client.search(aggregationQuery);
  
        const eventCounts = {};
        body.aggregations.event_counts.buckets.forEach(bucket => {
            eventCounts[bucket.key] = bucket.doc_count;
        });

        const eventTypes = ['GRB', 'Apparent Brightness Rise', 'UV Rise', 'X-Ray Rise', 'Comet'];
        
        const result = {};

        // Fill the result object with event types and their corresponding counts
        eventTypes.forEach(eventType => {
            result[eventType] = eventCounts[eventType] || 0;
        });

        console.log('Event Counts:', result);
  
        return eventCounts;
    } catch (error) {
        console.error('Error getting event counts:', error.message);
        return {};
    }
}
  


// Call the function to search and retrieve documents
// searchDocuments();
// getMessages({ eventType: 'All', sourceType: 'All', startDate: '', endDate: ''});
// getMessages({ eventType: 'All', sourceType: 'All' });
// getMessagesByEvent('X-Ray Rise');
// getLast();
// getRecentMessages();
getEventCounts();