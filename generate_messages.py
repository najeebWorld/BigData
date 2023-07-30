import random
import datetime
import pytz
from confluent_kafka import Producer
import time
import redis
import json
import uuid
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Connect to Redis
redis_con = redis.Redis(host='localhost', port=6379, db=0)

# Get environment variables
broker = os.getenv('BROKER')
username = os.getenv('USERNAME')
password = os.getenv('PASSWORD')

# Define the events
events = [
    'GRB',
    'Apparent Brightness Rise',
    'UV Rise',
    'X-Ray Rise',
    'Comet'
]

# Define the sources
sources = [
    'MMT',
    'Gemini Observatory Telescopes',
    'Very Large Telescope',
    'Subaru Telescope',
    'Large Binocular Telescope',
    'Southern African Large Telescope',
    'Keck 1 and 2',
    'Hobby-Eberly Telescope',
    'Gran Telescopio Canarias',
    'The Giant Magellan Telescope',
    'Thirty Meter Telescope',
    'European Extremely Large Telescope'
]

def generate_message():
    """
    Generate a random message.

    Message example:
    {
        'event': 'GRB', 
        'source': 'MMT', 
        'date': '2023-08-06 12:12:44 UTC', 
        'ra': '22:10:00.10', 
        'dec': '-28:17:33.00', 
        'name': 'A5V', 
        'urgency': 2
    }
    """

    msg = {}
    msg['event'] = random_event()
    msg['source'] = random_source()
    msg['date'] = random_date()
    msg['ra'], msg['dec'], msg['name'] = random_ra_dec_name()
    msg['urgency'] = random_urgency()
    return msg

def random_event():
    """
    Generate a random event.
    """
    return random.choice(events)

def random_source():
    """
    Generate a random source.
    """
    return random.choice(sources)

def random_date():
    """
    Generate a random date in the past 30 days.
    """
    curr_date = datetime.datetime.now(pytz.utc)
    delta = datetime.timedelta(days=random.randint(0, 30), hours=random.randint(0, 24), minutes=random.randint(0, 60), seconds=random.randint(0, 60))
    return (curr_date - delta).strftime('%Y-%m-%d %H:%M:%S %Z')

def random_ra_dec_name():
    """
    Generate a random RA, DEC, and name.
    """
    star_id = random.randint(1, 9096)
    star = redis_con.hget('BSC', star_id)
    star = json.loads(star)
    ra = star['RA']
    dec = star['DEC']
    name = star['Title HD']
    return ra, dec, name

def random_urgency():
    """
    Generate a random urgency.
    """
    return random.randint(1, 5)

def message_status(err, msg):
    """
    Called once for each message produced to indicate delivery result.
    """
    if err is not None:
        print('Message staus: failed: {}'.format(err))
    else:
        print('Message sent to {} [{}]'.format(msg.topic(), msg.partition()))

def send_msg_to_kafka(producer, msg):
    """
    Send a message to Kafka.
    """
    try:
        producer.produce(
            topic=username + "-space",
            key=str(uuid.uuid4()),
            value=json.dumps(msg).encode('utf-8'),
            callback=message_status
        )
        producer.flush()
        print("message successfully sent to kafka")
    except Exception as e:
        print("error while sending message to kafka")


if __name__ == '__main__':
    # Create a Kafka configuration object
    kafka_config = {
        'bootstrap.servers': broker,
        'session.timeout.ms': 6000,
        'default.topic.config': {'auto.offset.reset': 'smallest'},
        'security.protocol': 'SASL_SSL',
	    'sasl.mechanisms': 'SCRAM-SHA-256',
        'sasl.username': username,
        'sasl.password': password
    }
    # Create a Kafka producer
    producer = Producer(kafka_config)

    # Send a message to Kafka every 12 seconds
    while True:
        msg = generate_message()
        send_msg_to_kafka(producer, msg)
        print(msg)
        time.sleep(12)
    