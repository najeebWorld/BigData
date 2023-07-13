import requests
from bs4 import BeautifulSoup

# Send a GET request to the web page
url = "https://theskylive.com/sun-info"
response = requests.get(url)

# Create a BeautifulSoup object with the HTML content
soup = BeautifulSoup(response.content, 'html.parser')

with open('theskylive.html', 'w') as outfile:
    outfile.write(str(soup))

# Find the relevant div elements
rise_div = soup.find('div', class_='rise')
transit_div = soup.find('div', class_='transit')
set_div = soup.find('div', class_='set')

# Extract the data from the rise div
rise_azimuth = rise_div.find('azimuth').text.strip().split(":")[1].strip()
rise_time = rise_div.find('time').text.strip()

# Extract the data from the transit div
transit_altitude = transit_div.find('altitude').text.strip().split(":")[1].strip()
transit_time = transit_div.find('time').text.strip()

# Extract the data from the set div
set_azimuth = set_div.find('azimuth').text.strip().split(":")[1].strip()
set_time = set_div.find('time').text.strip()

# Print the extracted data
print("Rise Azimuth:", rise_azimuth)
print("Rise Time:", rise_time)
print("Transit Altitude:", transit_altitude)
print("Transit Time:", transit_time)
print("Set Azimuth:", set_azimuth)
print("Set Time:", set_time)
