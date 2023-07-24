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

broker = os.getenv('BROKER')
username = os.getenv('USERNAME')
password = os.getenv('PASSWORD')

events = [
    'GRB',
    'Apparent Brightness Rise',
    'UV Rise',
    'X-Ray Rise',
    'Comet'
]

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
    return random.choice(events)

def random_source():
    return random.choice(sources)

def random_date():
    curr_date = datetime.datetime.now(pytz.utc)
    delta = datetime.timedelta(days=random.randint(0, 30), hours=random.randint(0, 24), minutes=random.randint(0, 60), seconds=random.randint(0, 60))
    return (curr_date + delta).strftime('%Y-%m-%d %H:%M:%S %Z')

def random_ra_dec_name():
    # ra = random.randint(0, 360)
    # dec = random.randint(-90, 90)
    star_id = random.randint(1, 9096)
    star = redis_con.hget('BSC', star_id)
    star = json.loads(star)
    ra = star['RA']
    dec = star['DEC']
    name = star['Title HD']
    return ra, dec, name

def random_urgency():
    return random.randint(1, 5)

def message_status(err, msg):
    if err is not None:
        print('Message staus: failed: {}'.format(err))
    else:
        print('Message sent to {} [{}]'.format(msg.topic(), msg.partition()))

def send_msg_to_kafka(producer, msg):
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


# def read_ccloud_config(config_file):
#     conf = {}
#     with open(config_file) as fh:
#         for line in fh:
#             line = line.strip()
#             if len(line) != 0 and line[0] != "#":
#                 parameter, value = line.strip().split('=', 1)
#                 conf[parameter] = value.strip()
#     return conf

if __name__ == '__main__':
    kafka_config = {
        'bootstrap.servers': broker,
        'session.timeout.ms': 6000,
        'default.topic.config': {'auto.offset.reset': 'smallest'},
        'security.protocol': 'SASL_SSL',
	    'sasl.mechanisms': 'SCRAM-SHA-256',
        'sasl.username': username,
        'sasl.password': password
    }
    producer = Producer(kafka_config)

    while True:
        msg = generate_message()
        send_msg_to_kafka(producer, msg)
        print(msg)
        time.sleep(12)
    