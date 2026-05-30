import { runOutboxPlayground } from "./kafka/playground";

runOutboxPlayground().catch((error) => {
  console.error("Outbox playground failed", error);
  process.exitCode = 1;
});