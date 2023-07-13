const express = require('express');
const Redis = require('ioredis');

const app = express();

port = 3000;

const client = new Redis({
    host: 'localhost',
    port: 6379
});
console.log('Successfully connected to Redis');

app.get('/', (req, res) => {
    res.send('Node app with Redis!');
});

app.get('/set', async (req, res) => {
    key = req.query.key;
    value = req.query.value;
    let response = await client.set(key, value);
    console.log('Set key: ' + key + ' with value: ' + value + ' with response: ' + response);
    res.send(true);
});

app.get('/get', async (req, res) => {
    key = req.query.key;
    let value = await client.get(key);
    console.log('Get key: ' + key + ' with value: ' + value);
    res.send(value);
});

app.get('/hset', async (req, res) => {
    key = req.query.key;
    field = req.query.field;
    value = req.query.value;
    let response = await client.hset(key, field, value);
    console.log('Set key: ' + key + ' with field: ' + field + ' with value: ' + value + ' with response: ' + response);
    res.send(true);
});

app.get('/hget', async (req, res) => {
    key = req.query.key;
    field = req.query.field;
    let value = await client.hget(key, field);
    console.log('Get key: ' + key + ' with field: ' + field + ' with value: ' + value);
    res.send(value);
});

app.get('/hgetall', async (req, res) => {
    key = req.query.key;
    let value = await client.hgetall(key);
    console.log('Get key: ' + key + ' with value: ' + value);
    res.send(value);
});

app.listen(port, () => {
    console.log(`Node app listening on port ${port}`);
    console.log(`http://localhost:${port}`);
});
