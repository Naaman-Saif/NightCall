import type { IncidentEvent } from '../investigation/event-types';

export class StreamCursor {
  constructor(
    private lastSent: number,
    private readonly send: (event: IncidentEvent) => void,
  ) {}

  offer(event: IncidentEvent): void {
    if (event.sequence <= this.lastSent) return;
    this.lastSent = event.sequence;
    this.send(event);
  }
}
