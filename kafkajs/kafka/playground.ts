import { Partitioners } from "kafkajs";
import { kafka } from "./client";
import { KafkaOutboxPublisher, OutboxStore } from "./outbox";

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
  idempotent: true,
  maxInFlightRequests: 1,
  retry: {
    retries: Number.MAX_SAFE_INTEGER,
  },
});

export async function runOutboxPlayground() {
  const store = new OutboxStore(process.env.OUTBOX_DB_FILE ?? "outbox.db");
  const outbox = new KafkaOutboxPublisher(producer, store, {
    batchSize: 25,
    maxAttempts: 8,
    retryDelayMs: 1_000,
    maxRetryDelayMs: 30_000,
  });

  await producer.connect();

  const eventId = store.enqueue({
    topic: process.env.KAFKA_TOPIC ?? "test-topic",
    eventType: "email.requested",
    key: "user-123",
    payload: {
      userId: "user-123",
      to: "user@example.com",
      template: "welcome",
      requestedAt: new Date().toISOString(),
    },
    headers: {
      source: "playground",
    },
  });

  const metadata = await outbox.flushOnce();
  const stats = store.getStats();

  console.log("Enqueued outbox event", { eventId });
  console.log("Kafka publish metadata", metadata);
  console.log("Outbox stats", stats);

  await producer.disconnect();
}