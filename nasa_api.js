const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.get('/neos', async (req, res) => {
    const start_date = req.query.start_date;
    const end_date = req.query.end_date;
    const api_key = 'yjNST9fqqGae3TgkR93t2ekXDqdwFEx3ghVcidgT';
    const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${start_date}&end_date=${end_date}&api_key=${api_key}`;

    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
