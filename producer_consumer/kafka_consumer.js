const { Kafka } = require('kafkajs');
const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

broker = process.env.BROKER
username = process.env.USERNAME
password = process.env.PASSWORD
topic = username + '-space'

// Create a new instance of the Kafka client
const kafka = new Kafka({
    clientId: 'my-consumer',
    brokers: [broker],
    ssl: true,
    sasl: {
        mechanism: 'scram-sha-512',
        username: username,
        password: password
    },
});

// Create a new consumer
const consumer = kafka.consumer({ groupId: username + '-group' });

// Connect to the Kafka cluster
async function run() {
    await consumer.connect();

    // Subscribe to the desired topic(s)
    await consumer.subscribe({ topic: topic });

    // Start consuming messages
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            // Index the document in Elasticsearch
            await indexDocument(JSON.parse(message.value.toString()));

            // Process the received message
            console.log({
                topic,
                partition,
                offset: message.offset,
                value: message.value.toString(),
            });
        },
    });
}

// Run the consumer
run().catch((error) => {
    console.error('Error:', error);
});

// Create a new instance of the Elasticsearch client
const esClient = new Client({
    node: 'http://localhost:9200'
});

// Index the document
async function indexDocument(message) {
    try {
        const response = await esClient.index({
            index: 'space',
            body: message,
        });
        console.log(`Document indexed successfully. ID: ${response.body._id}`);
    } catch (error) {
        console.error('Error indexing document:', error);
    }
}