import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync } from 'node:fs';

import type { EventDraft, IncidentEvent } from './event-types';
import { eventsPath, incidentFolder } from './incident-paths';
import { KeyedQueue } from './keyed-queue';
import type { LiveStream } from './live-stream';
import { writeSnapshot } from './snapshot-file';
import { recoverLog } from './tail-recovery';

export type AppendPlan = (events: IncidentEvent[]) => EventDraft | IncidentEvent;

function isStoredEvent(planned: EventDraft | IncidentEvent): planned is IncidentEvent {
  return 'sequence' in planned;
}

export class EventWriter {
  readonly queue = new KeyedQueue();

  constructor(
    readonly stateDir: string,
    private readonly stream: LiveStream,
  ) {}

  update(incidentId: string, plan: AppendPlan): Promise<IncidentEvent> {
    return this.queue.run(`incident:${incidentId}`, () => this.write(incidentId, plan));
  }

  private write(incidentId: string, plan: AppendPlan): IncidentEvent {
    const folder = incidentFolder(this.stateDir, incidentId);
    const events = recoverLog(folder);
    const planned = plan(events);
    if (isStoredEvent(planned)) return planned;
    const stamp = { id: randomUUID(), incidentId, sequence: events.length + 1, occurredAt: new Date().toISOString() };
    const event: IncidentEvent = { ...stamp, ...planned };
    mkdirSync(folder, { recursive: true });
    appendFileSync(eventsPath(folder), `${JSON.stringify(event)}\n`);
    writeSnapshot(folder, [...events, event]);
    this.stream.publish(event);
    return event;
  }
}
