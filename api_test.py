import requests
import json

# API Key
API_KEY = 'yjNST9fqqGae3TgkR93t2ekXDqdwFEx3ghVcidgT'

""" NEO FEED - Get a list of Asteroids based on their closest approach date to Earth """
# Start and End Date
START_DATE = '2023-07-12'
END_DATE = '2023-07-13'
url = f'https://api.nasa.gov/neo/rest/v1/feed?start_date={START_DATE}&end_date={END_DATE}&api_key={API_KEY}'
# example = 'https://api.nasa.gov/neo/rest/v1/feed?start_date=2015-09-07&end_date=2015-09-08&api_key=DEMO_KEY'

""" NEO Lookup - lookup data for a specific asteroid based on its ID """
# example = 'https://api.nasa.gov/neo/rest/v1/neo/3542519?api_key=DEMO_KEY'

""" NEO Browse - Browse the overall Asteroid data-set """
# example = 'https://api.nasa.gov/neo/rest/v1/neo/browse?&api_key=DEMO_KEY'

# Get Response
response = requests.get(url)

with open('response.json', 'w') as outfile:
    json.dump(response.json(), outfile, indent=4)

# Print Response Status Code
print(response.status_code)
