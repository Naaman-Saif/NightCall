import type { ProductionEvent } from './series-sample';

export const EVENTS_KEPT_MS = 30 * 60 * 1000;

export type EventsQuery = { services: string[]; after: string };

export class EventsBuffer {
  private events: ProductionEvent[] = [];

  add(event: ProductionEvent): void {
    if (this.events.some((existing) => existing.id === event.id)) return;
    const cutoff = Date.now() - EVENTS_KEPT_MS;
    this.events = [...this.events, event].filter((kept) => Date.parse(kept.at) >= cutoff);
  }

  matching(query: EventsQuery): ProductionEvent[] {
    const services = new Set(query.services);
    return this.events.filter((event) => services.has(event.service) && event.at > query.after);
  }

  latestSeconds(): number | null {
    const latest = this.events.reduce((highest, event) => Math.max(highest, Date.parse(event.at)), 0);
    return latest === 0 ? null : Math.floor(latest / 1000);
  }
}
