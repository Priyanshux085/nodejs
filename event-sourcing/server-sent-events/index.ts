import type { INotificationManager, ServerSentEvent } from "./defintion";
import { ServerResponse } from "http";

class NotificationManager implements INotificationManager {
  private clients: Map<string, ServerResponse>;

  constructor() {
    this.clients = new Map();
  }

  addClient(id: string, res: ServerResponse) {
    this.clients.set(id, res);
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  broadcastEvent(event: ServerSentEvent) {
    const eventString = this.formatEvent(event);
    for (const res of this.clients.values()) {
      res.write(eventString);
    }
  }
  formatEvent(event: ServerSentEvent) {
    throw new Error("Method not implemented.");
  }

  sendEventToClient(id: string, event: ServerSentEvent): void {
    const res = this.clients.get(id);
    if (res) {
      const eventString = this.formatEvent(event);
      res.write(eventString);
    }
  }
}

export const notificationManager = new NotificationManager();