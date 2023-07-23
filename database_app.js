const express = require('express');
const cors = require('cors');
const { Client } = require('@elastic/elasticsearch');

const app = express();

app.use(cors());

// Server port
const PORT = 3001;

// Create Elasticsearch client
const client = new Client({ node: 'http://localhost:9200' });

// Define the index you want to read from
const index = 'space';

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

// Start the server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});