import json
import redis

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0)

# Load data from BSC.json
with open('BSC.json', 'r') as file:
    data = json.load(file)

# Store data in Redis
for star in data:
    # Assuming the star data has an 'id' field as the key
    key = star['harvard_ref_#']
    # Store the star data as a JSON string
    value = json.dumps(star)
    # Set the key-value pair in Redis
    r.hset('BSC', key, value)

# Print the total number of stars stored
print(f"Total stars stored in Redis: {len(data)}")
