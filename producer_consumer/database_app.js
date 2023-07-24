const express = require('express');
const cors = require('cors');
const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();
const axios = require('axios');

const app = express();

app.use(cors());

// Server port
const PORT = 3001;

// Create Elasticsearch client
const client = new Client({ node: 'http://localhost:9200' });

// Define the index you want to read from
const index = 'space';

// Get the NASA API key from the environment variables
const api_key = process.env.NASA_API_KEY;

// Define the endpoint to search documents
app.get('/search', async (req, res) => {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const eventType = req.query.eventType;
    const sourceType = req.query.sourceType;
    console.log(`Searching for messages between ${startDate} and ${endDate} with event type ${eventType} and source type ${sourceType}`);
    messages = getMessages({ startDate, endDate, eventType, sourceType }).then((messages) => {
        res.json(messages);
    }).catch((error) => {
        res.status(500).json({ error: 'An error occurred' });
    });
});

app.get('/getlast', async (req, res) => {
    console.log('Getting last recieved message');
    messages = getLastMessage().then((message) => {
        res.json(message);
    }).catch((error) => {
        res.status(500).json({ error: 'An error occurred' });
    });
});

app.get('/getrecent', async (req, res) => {
    console.log('Getting recent messages');
    messages = getRecentMessages().then((messages) => {
        res.json(messages);
    }).catch((error) => {
        res.status(500).json({ error: 'An error occurred' });
    });
});

app.get('/geteventcounts', async (req, res) => {
    console.log('Getting event counts');
    messages = getEventCounts().then((messages) => {
        res.json(messages);
    }).catch((error) => {
        res.status(500).json({ error: 'An error occurred' });
    });
});

app.get('/getneos', async (req, res) => {
    // Get the current date and time
    const currentDate = new Date();
    // Get the date and time for exactly 24 hours ago
    const twentyFourHoursAgo = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000)
    // Get the date and time for 24 hours in the future
    const twentyFourHoursLater = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)

    const today = currentDate.toISOString().split('T')[0];
    const yesterday = twentyFourHoursAgo.toISOString().split('T')[0];
    const tomorrow = twentyFourHoursLater.toISOString().split('T')[0];

    console.log(`Getting NEOs between ${yesterday} and ${tomorrow}`);

    const neoList = await getNEOs(yesterday, tomorrow);
    const neos = {
        'last': findNEOsInTimeFrame([...neoList[yesterday], ...neoList[today]], twentyFourHoursAgo, currentDate),
        'next': findNEOsInTimeFrame([...neoList[today], ...neoList[tomorrow]], currentDate, twentyFourHoursLater),
    }
    res.json(neos);
});


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
                size: 1000,
                query,
            },
        });

        console.log(`Retrieved ${response.hits.total.value} messages`);
        return response.hits.hits.map((hit) => hit._source);;
    } catch (error) {
        console.error('Error retrieving messages:', error);
        return [];
    }
}

async function getLastMessage() {
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
                size: 11, // 10 recent messages + 1 for the first one
                sort: [
                    { '@timestamp': { order: 'desc' } }, // Sort by timestamp in descending order
                ],
            },
        };
    
        const body = await client.search(searchQuery);
    
        // Exclude the first message from the result
        const messages = body.hits.hits.slice(1).map(hit => hit._source);
    
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
  
        return eventCounts;
    } catch (error) {
        console.error('Error getting event counts:', error.message);
        return {};
    }
}

async function getNEOs(start_date, end_date) {
    const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${start_date}&end_date=${end_date}&api_key=${api_key}`;
    try {
        const response = await axios.get(url);
        return response.data.near_earth_objects;
    } catch (error) {
        console.error('Error getting NEOs:', error.message);
        return {};
    }
}

// Function to filter NEOs within a given time frame
function findNEOsInTimeFrame(neoList, startTime, endTime) {
    // Filter the NEOs based on the close_approach_date_full field
    const neosInTimeFrame = neoList.filter((neo) => {
        const approaches = neo.close_approach_data;
        return approaches.some((approach) => {
            const closeApproachTime = new Date(approach.close_approach_date_full);
            return closeApproachTime >= startTime && closeApproachTime <= endTime;
        });
    });
  
    return neosInTimeFrame;
}
  

// Start the server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});