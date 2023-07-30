const express = require('express')
const WebSocket = require('ws');
const app = express()
const axios = require('axios');
const port = 3000

// Create a new instance of the WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Store connected clients in an array
const connections = new Set();

// Listen for new connections
wss.on('connection', (ws) => {
    // Add the new client to the array of connected clients
    connections.add(ws);
    console.log('New client connected');

    // If a client closes the connection, remove it from the array of connected clients
    ws.on('close', () => {
        connections.delete(ws);
    });
});

// Simulate sending data from the server every 12 seconds
setInterval(() => {
    // Make a request to the server to get the most recent message
    axios.get(`http://localhost:3001/getlast`)
        .then((response) => {
            // Check if the message has high urgency (urgency >= 4)
            if(response.data.urgency >= 4) {
                // Send the message to all connected clients
                const data = JSON.stringify(response.data);
                connections.forEach((client) => {
                    // Check if the client connection is open
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(data);
                    }
                });
            }
        })
        .catch((error) => {
            console.error('Error making the request:', error.message);
        });
}, 12000); // 12 seconds

// Serve the dashboard
app.use(express.static('dashboard'))
  
// Start the server
app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})