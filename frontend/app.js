const express = require('express')
const WebSocket = require('ws');
const app = express()
const axios = require('axios');
const port = 3000

const wss = new WebSocket.Server({ port: 8080 });

// Store connected clients in an array
const connections = new Set();

// Function to send a message to all connected clients
function broadcastMessage(message) {
    connections.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

wss.on('connection', (ws) => {
    connections.add(ws);
    console.log('New client connected');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received message from client:', data);
        } catch (error) {
            console.error('Error processing incoming message:', error);
        }
    });

    ws.on('close', () => {
        connections.delete(ws);
    });
});

// Simulate sending data from the server every 12 seconds
setInterval(() => {
    axios.get(`http://localhost:3001/getlast`)
        .then((response) => {
            if(response.data.urgency >= 4) {
                const data = JSON.stringify(response.data);
                connections.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(data);
                    }
                });
            }
            if(response.data.urgency >= 4) {
                console.log('Recent message has high urgency:', response.data.urgency);
            }
        })
        .catch((error) => {
            console.error('Error making the request:', error.message);
        });
}, 12000);

app.use(express.static('dashboard'))
  
app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})