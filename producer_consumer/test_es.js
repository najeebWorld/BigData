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


// Call the function to search and retrieve documents
// searchDocuments();
// getMessages({ eventType: 'All', sourceType: 'All', startDate: '', endDate: ''});
// getMessages({ eventType: 'All', sourceType: 'All' });
// getMessagesByEvent('X-Ray Rise');
getLast();