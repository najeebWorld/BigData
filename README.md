# Big Data Processing System for Astronomical Events

## Introduction

Big data processing systems are at the forefront of technological challenges in recent years. In the business world, the ability to turn the masses of data stored operationally from a burden into an asset that enables risk management and decision-making based on insights learned from this data is a central task in modern corporate management.

In scientific fields such as medical or astronomical research, fields characterized by the accumulation of data and information at rates that are orders of magnitude greater than their processing capacity, methods, technologies, and infrastructures are required that deal with the challenges in a way that allows supporting the needs of users and researchers efficiently and quickly.

In this project, we will design a system fed by relays alerting to astronomical events, presenting them in real-time (NRT) or at a daily update level, storing and enabling research and search, as well as finding patterns using machine learning as a bonus.

## Features

- Real-time alerting: The system processes astronomical event alerts in real-time, providing up-to-date information on celestial events.
- Daily updates: For less time-critical analysis, the system also offers daily updates, ensuring that all relevant information is captured.
- Data storage: The system securely stores all astronomical event alerts for future reference and analysis.
- Search and research capabilities: Users can efficiently search and perform in-depth research on stored astronomical events.

## How to Run

Follow the steps below to set up and run the Big Data processing system for astronomical events:

### 1. Install Dependencies

Ensure you have the following dependencies installed on your system:
- Docker
- Node.js (npm)
- Python 3

### 2. Pull and Run Elasticsearch Docker Container

```bash
docker pull docker.elastic.co/elasticsearch/elasticsearch:7.14.0

docker run --name space_elasticsearch -d -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" docker.elastic.co/elasticsearch/elasticsearch:7.14.0
```

### 3. Pull and Run Redis Docker Container

```bash
docker pull redis

docker run --name space_redis -p 6379:6379 -d redis
```

### 4. Load the Bright Star Catalogue Data into Redis

```bash
python3 load_BSC_to_redis.py
```

### 5. Start the Kafka Consumer

```bash
node kafka_consumer.js
```

### 6. Start the Generator and Kafka Producer

```bash
python3 generate_messages.py
```

### 7. Start the Elasticsearch and Redis Database API

```bash
node database_app.js
```

### 8. Start the Dashboard Web Server

```bash
cd frontend
node app.js
```

### 9. Open the Dashboard in your Browser

Open the following URL in your browser: http://localhost:3000