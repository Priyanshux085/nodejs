import {  randomUUIDv7 as uuidv4 } from "bun";
import { kafka } from "./client";

const producer = kafka.producer({
  idempotent: true,
  maxInFlightRequests: 1,
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runNotificationPlayground(options?: {
  startIntervalMs?: number;
  multiplier?: number;
  maxIntervalMs?: number;
  topic?: string;
}) {
  const startIntervalMs = options?.startIntervalMs ?? 5000; // 5s
  const multiplier = options?.multiplier ?? 2; // exponential growth
  const maxIntervalMs = options?.maxIntervalMs ?? 60_000; // cap at 60s
  const topic = options?.topic ?? process.env.KAFKA_TOPIC ?? "notifications";

  await producer.connect();
  console.log("Notification playground connected to Kafka, topic:", topic);

  let interval = startIntervalMs;
  let count = 0;

  // handle graceful shutdown
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    console.log("Stopping notification playground...");
    try {
      await producer.disconnect();
    } catch (err) {
      console.error("Error disconnecting producer:", err);
    }
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (!stopping) {
    const id = uuidv4();
    const payload = {
      id,
      type: "notification.email",
      to: `user-${count}@example.com`,
      subject: `Welcome #${count}`,
      body: `Hello user ${count}, this is a test notification.`,
      count,
      sentAt: new Date().toISOString(),
    } as const;

    try {
      const metadata = await producer.send({
        topic,
        messages: [
          {
            key: `user-${count}`,
            value: JSON.stringify(payload),
            headers: {
              eventType: "notification.email",
              playground: "notification",
              outboxId: id,
            },
          },
        ],
      });

      console.log(`Sent notification #${count}`, { id, metadata, interval });
    } catch (err) {
      console.error("Failed to send notification", err);
    }

    // sleep for current interval
    await sleep(interval);

    // increase interval exponentially, capped
    interval = Math.min(Math.round(interval * multiplier), maxIntervalMs);
    count += 1;
  }
}
