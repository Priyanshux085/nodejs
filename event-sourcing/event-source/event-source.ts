// Event Source 
import type { Event, INotificationManager } from './definiton';

class EventSource implements INotificationManager {
  private listeners: Map<string, Function[]>;
  constructor() {
    this.listeners = new Map<string, Function[]>();
  }

  addListener(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  removeListener(event: string, listener: Function): void {
    if (!this.listeners.has(event)) return;
    this.listeners.set(event, this.listeners.get(event)!.filter(l => l !== listener));
  }

  emit(event: Event): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event.payload));
    }
  }
}

export const eventSource = new EventSource();