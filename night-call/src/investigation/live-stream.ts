import { Injectable } from '@nestjs/common';

import type { IncidentEvent } from './event-types';

export type EventListener = (event: IncidentEvent) => void;

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

  publish(event: IncidentEvent): void {
    for (const listener of this.listeners.get(event.incidentId) ?? []) listener(event);
  }
}
