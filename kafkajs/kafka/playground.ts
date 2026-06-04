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

const lokiUrl = process.env.LOKI_URL ?? "http://localhost:3100";
const lokiLabels = {
  app: "kafkajs",
  playground: "outbox",
  ...(process.env.LOKI_APP_LABEL ? { app: process.env.LOKI_APP_LABEL } : {}),
};

async function sendLogToLoki(level: "info" | "error", message: string, details?: unknown) {
  const timestamp = (BigInt(Date.now()) * 1_000_000n).toString();
  const line = JSON.stringify({ level, message, details });

  try {
    const response = await fetch(`${lokiUrl}/loki/api/v1/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        streams: [
          {
            stream: lokiLabels,
            values: [[timestamp, line]],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Loki rejected playground log", {
        status: response.status,
        statusText: response.statusText,
        body,
      });
    }
  } catch (error) {
    console.error("Failed to push log to Loki", error);
  }
}

async function logInfo(message: string, details?: unknown) {
  console.log(message, details ?? "");
  await sendLogToLoki("info", message, details);
}

async function logError(message: string, details?: unknown) {
  console.error(message, details ?? "");
  await sendLogToLoki("error", message, details);
}

export async function runOutboxPlayground() {
  const store = new OutboxStore(process.env.OUTBOX_DB_FILE ?? "outbox.db");
  const outbox = new KafkaOutboxPublisher(producer, store, {
    batchSize: 25,
    maxAttempts: 8,
    retryDelayMs: 1_000,
    maxRetryDelayMs: 30_000,
  });

  
  try {
    await producer.connect();
    
    // Stimulate some delay before starting to send logs to Loki, 
    // Send a log entry after every 5 seconds to indicate the playground is still running.
    let logCount = 0;
    while (logCount < 16) { // Limit to 16 logs (80 seconds) for demonstration
      await setTimeout(async () => {  
        await logInfo("Starting outbox playground", {
          kafkaBrokers: process.env.KAFKA_BROKERS ?? "localhost:9092",
          topic: process.env.KAFKA_TOPIC ?? "test-topic",
          lokiUrl,
        });
      }, 5000);
      logCount++;
    }
  } catch (error) {
    await logError("Failed to connect Kafka producer", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

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

  await logInfo("Enqueued outbox event", { eventId });
  await logInfo("Kafka publish metadata", metadata);
  await logInfo("Outbox stats", stats);

  await producer.disconnect();
}