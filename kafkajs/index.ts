import { runOutboxPlayground } from "./kafka/playground";
import { runNotificationPlayground } from "./kafka/notification_playground";

const which = process.env.PLAYGROUND ?? "outbox";

if (which === "notifications") {
  runNotificationPlayground().catch((error) => {
    console.error("Notification playground failed", error);
    process.exitCode = 1;
  });
} else {
  runOutboxPlayground().catch((error) => {
    console.error("Outbox playground failed", error);
    process.exitCode = 1;
  });
}