// Event Sourcing implementation for the application

import { EventEmitter } from 'events';

interface Event {
  type: string;
  payload: any;
  timestamp: Date;
}

class EventStore {
  private events: Event[] = [];

  addEvent(event: Event) {
    this.events.push(event);
  }

  getEvents() {
    return this.events;
  }
}

class EventSourcing extends EventEmitter {
  private eventStore: EventStore;

  constructor() {
    super();
    this.eventStore = new EventStore();
  }

  emitEvent(type: string, payload: any) {
    const event: Event = {
      type,
      payload,
      timestamp: new Date(),
    };
    this.eventStore.addEvent(event);
    this.emit(type, payload);
  }

  getEventHistory() {
    return this.eventStore.getEvents();
  }
}

export { EventSourcing };
export type { Event };
