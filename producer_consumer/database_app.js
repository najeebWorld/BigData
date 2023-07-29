const express = require('express');
const cors = require('cors');
const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

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
    const yesterday_today = [...neoList[yesterday], ...neoList[today]];
    const today_tomorrow = [...neoList[today], ...neoList[tomorrow]];
    const neos = {
        'last': findNEOsInTimeFrame(yesterday_today, twentyFourHoursAgo, currentDate),
        'next': findNEOsInTimeFrame(today_tomorrow, currentDate, twentyFourHoursLater),
    }
    res.json(neos);
});

app.get('/geteventdistribution', async (req, res) => {
    // Get the current date and time
    const currentDate = new Date();
    // Get the date and time for exactly 1 week ago
    const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    // Get all the messages from the last week
    const messages = await getMessages({ startDate: oneWeekAgo.toISOString().split('T')[0], endDate: currentDate.toISOString().split('T')[0] });
    // Make distribution based on urgency
    const eventDistribution = {
        'GRB': {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
        },
        'Apparent Brightness Rise': {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
        },
        'UV Rise': {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
        },
        'X-Ray Rise': {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
        },
        'Comet': {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
        }
    };
    messages.forEach((message) => {
        eventDistribution[message.event][message.urgency] += 1;
    });
    res.json(eventDistribution);
});

app.get('/getneodistribution', async (req, res) => {
    // Get the current date and time and the date and time for exactly 1 week ago
    const week_one_1 = new Date();
    const week_one_2 = new Date(week_one_1.getTime() - 7 * 24 * 60 * 60 * 1000)
    // Get next window by week
    const week_two_1 = new Date(week_one_2.getTime() - 1 * 24 * 60 * 60 * 1000)
    const week_two_2 = new Date(week_two_1.getTime() - 7 * 24 * 60 * 60 * 1000)
    // Get next window by week
    const week_three_1 = new Date(week_two_2.getTime() - 1 * 24 * 60 * 60 * 1000)
    const week_three_2 = new Date(week_three_1.getTime() - 7 * 24 * 60 * 60 * 1000)
    // Get next window by week
    const week_four_1 = new Date(week_three_2.getTime() - 1 * 24 * 60 * 60 * 1000)
    const week_four_2 = new Date(week_four_1.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // get all NEOs from the last 4 weeks in parallel
    const [neoList1, neoList2, neoList3, neoList4] = await Promise.all([
        getNEOs(week_one_2.toISOString().split('T')[0], week_one_1.toISOString().split('T')[0]),
        getNEOs(week_two_2.toISOString().split('T')[0], week_two_1.toISOString().split('T')[0]),
        getNEOs(week_three_2.toISOString().split('T')[0], week_three_1.toISOString().split('T')[0]),
        getNEOs(week_four_2.toISOString().split('T')[0], week_four_1.toISOString().split('T')[0])
    ]);

    // make distribution by size of neo
    const neoSizes = []

    Object.keys(neoList1).forEach((key) => {
        neoList1[key].forEach((neo) => {
            // add the avg between min and max size
            neoSizes.push((neo.estimated_diameter.meters.estimated_diameter_min + neo.estimated_diameter.meters.estimated_diameter_max) / 2)
        })
    })
    Object.keys(neoList2).forEach((key) => {
        neoList2[key].forEach((neo) => {
            // add the avg between min and max size
            neoSizes.push((neo.estimated_diameter.meters.estimated_diameter_min + neo.estimated_diameter.meters.estimated_diameter_max) / 2)
        })
    })
    Object.keys(neoList3).forEach((key) => {
        neoList3[key].forEach((neo) => {
            // add the avg between min and max size
            neoSizes.push((neo.estimated_diameter.meters.estimated_diameter_min + neo.estimated_diameter.meters.estimated_diameter_max) / 2)
        })
    })
    Object.keys(neoList4).forEach((key) => {
        neoList4[key].forEach((neo) => {
            // add the avg between min and max size
            neoSizes.push((neo.estimated_diameter.meters.estimated_diameter_min + neo.estimated_diameter.meters.estimated_diameter_max) / 2)
        })
    })

    // sort the sizes
    neoSizes.sort((a, b) => a - b);

    res.json(neoSizes);
});

app.get('/sunspots', async (req, res) => {
    try {
        const websiteURL = 'https://theskylive.com/sun-info';
        const page = await axios.get(websiteURL);
        const $ = cheerio.load(page.data);
    
        const table = $('div.sun_container');
        const image_url = table.find('img').attr('src');
    
        const absolute_image_url = new URL(image_url, websiteURL).toString();
    
        // Fetch the image from the absolute URL
        const imageResponse = await axios.get(absolute_image_url, { responseType: 'arraybuffer' });
    
        // Set the appropriate headers for the image response
        res.set('Content-Type', 'image/jpeg');
        res.set('Content-Disposition', 'inline');
    
        // Send the image data in the response
        res.send(Buffer.from(imageResponse.data));
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Failed to fetch the image.');
    }
});

app.get('/sundata', async (req, res) => {
    try {
        const url = 'https://theskylive.com/sun-info';
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
    
        // Find the relevant div elements
        const rise_div = $('div.rise');
        const transit_div = $('div.transit');
        const set_div = $('div.set');
        
        const rise_time = rise_div.find('time').text().trim();
        const transit_time = transit_div.find('time').text().trim();    
        const set_time = set_div.find('time').text().trim();

        const ra = $('div.keyinfobox:contains("Right Ascension") ar').text().trim();
        const dec = $('div.keyinfobox:contains("Declination") ar').text().trim();
        const constellation = $('div.keyinfobox:contains("Constellation") ar a').text().trim();
        const magnitude = $('div.keyinfobox:contains("Magnitude") ar').text().trim();
    
        // Prepare the response object
        const responseData = {
            rise_time,
            transit_time,
            set_time,
            ra,
            dec,
            constellation,
            magnitude,
        };
    
        res.json(responseData);
    } catch (error) {
        res.status(500).json({ error: 'Something went wrong.' });
    }
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
    console.log(`Getting NEOs from ${start_date} to ${end_date} from NASA API at ${url}`);
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