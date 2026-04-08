
import type { ServerResponse } from "http";

export interface ServerSentEvent {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
}

export interface INotificationManager {
  // the `res` argument refers to Node's ServerResponse object
  addClient(id: string, res: ServerResponse): void;
  removeClient(id: string): void;
  sendEventToClient(id: string, event: ServerSentEvent): void;
  broadcastEvent(event: ServerSentEvent): void;
}