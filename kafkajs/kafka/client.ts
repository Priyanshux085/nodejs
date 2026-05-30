import { Kafka, type KafkaConfig } from "kafkajs";

const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const config: KafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID ?? "kafkajs-outbox-app",
  brokers,
  ssl: process.env.KAFKA_SSL === "true",
  retry: {
    retries: 5,
  },
  logLevel: 2,
};

export const kafka = new Kafka(config);
