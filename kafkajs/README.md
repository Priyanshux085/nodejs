# kafka

KafkaJS + Bun SQLite outbox pattern example.

## Install

```bash
bun install
```

## Run

```bash
# Start local Kafka-compatible broker
docker compose up -d

# Kafka broker list, defaults to localhost:9092
export KAFKA_BROKERS=localhost:9092

# Optional topic, defaults to test-topic
export KAFKA_TOPIC=test-topic

bun run index.ts
```

## What is implemented

- SQLite-backed `outbox_events` table in `kafka/outbox.ts`
- Transactional enqueue to store domain events first
- Poll/claim batch flow for publisher workers
- Kafka publish with idempotent producer settings
- Exponential backoff retries and dead-letter state (`status = dead`) after max attempts
- Final state tracking (`pending`, `processing`, `published`, `dead`)

## Files

- `kafka/client.ts`: Kafka client config from env vars
- `kafka/outbox.ts`: Outbox store and dispatcher logic
- `kafka/playground.ts`: Example enqueue + flush run
- `index.ts`: Entrypoint for the playground

## Environment variables

- `KAFKA_BROKERS`: Comma-separated Kafka brokers
- `KAFKA_CLIENT_ID`: KafkaJS client ID
- `KAFKA_SSL`: `true` to enable SSL
- `KAFKA_TOPIC`: Topic for demo events
- `OUTBOX_DB_FILE`: SQLite file path, default `outbox.db`
