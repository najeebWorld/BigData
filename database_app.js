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
    messages = getRecentMessages(index).then((messages) => {
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

async function getRecentMessages(indexName) {
    try {
      // Search query to retrieve the most recent messages excluding the first one
      const searchQuery = {
        index: indexName,
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
  
      return messages;
    } catch (error) {
      console.error('Error retrieving recent messages:', error.message);
      return [];
    }
  }

// Start the server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});