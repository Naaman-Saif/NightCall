import { Injectable } from '@nestjs/common';

import type { IncidentEvent } from './event-types';

export type EventListener = (event: IncidentEvent) => void;

const EVERY_INCIDENT = '*';

@Injectable()
export class LiveStream {
  private readonly listeners = new Map<string, Set<EventListener>>();

  subscribe(incidentId: string, listener: EventListener): () => void {
    const listeners = this.listeners.get(incidentId) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(incidentId, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(incidentId);
    };
  }

  subscribeAll(listener: EventListener): () => void {
    return this.subscribe(EVERY_INCIDENT, listener);
  }

  publish(event: IncidentEvent): void {
    const targeted = [...(this.listeners.get(event.incidentId) ?? []), ...(this.listeners.get(EVERY_INCIDENT) ?? [])];
    for (const listener of targeted) listener(event);
  }
}
