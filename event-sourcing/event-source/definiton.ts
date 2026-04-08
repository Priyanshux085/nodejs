// Event Source type definitions

export interface Event {
  type: string;
  payload: any;
  timestamp: Date;
}

export interface INotificationManager {  
  addListener(event: string, listener: Function): void;
  removeListener(event: string, listener: Function): void;
}