import { EventEmitter } from "events";

class EventBus extends EventEmitter {}

declare global {
  var _crawlerEventBus: EventBus | undefined;
}

export function getEventBus(): EventBus {
  if (!globalThis._crawlerEventBus) {
    globalThis._crawlerEventBus = new EventBus();
  }
  return globalThis._crawlerEventBus;
}
