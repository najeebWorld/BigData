# BigData

## To Pull The Elastic Search Docker:
```bash
docker pull docker.elastic.co/elasticsearch/elasticsearch:7.14.0
```

## To Run The Elastic Search Docker:
```bash
docker run --name space_elasticsearch -d -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" docker.elastic.co/elasticsearch/elasticsearch:7.14.0
```

## To Pull The Redis Docker:
```bash
docker pull redis
```

## To Run The Redis Docker:
```bash
docker run --name space_redis -p 6379:6379 -d redis
```

## To Load The Bright Star Catalogue Data Into Redis:
```bash
python3 load_BSC_to_redis.py
```

## To Start The Kafka Consumer:
```bash
node kafka_consumer.js
```

## To Start The Generator and Kafka Producer:
```bash
python3 generate_messages.py
```

## To Start The ElasticSearch and Redis Database API:
```bash
node database_app.js
```

## To Start The Dashboard Web Server:
```bash
cd frontend
node app.js
```