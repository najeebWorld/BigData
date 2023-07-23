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
        documents.forEach((doc) => {
            console.log(`Document ID: ${doc._id}, Source: ${JSON.stringify(doc._source)}`);
        });
    } catch (error) {
        console.error('Error searching documents:', error);
    }
}

// Call the function to search and retrieve documents
searchDocuments();
