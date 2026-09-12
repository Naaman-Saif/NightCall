import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { EventBody } from './event-body';

export type IncidentEvent = { id: string; incidentId: string; sequence: number; occurredAt: string } & EventBody;

function countEvents(path: string): number {
  if (!existsSync(path)) return 0;
  return readFileSync(path, 'utf8').split('\n').filter((line) => line.trim() !== '').length;
}

export class EventLog {
  constructor(private readonly stateDir: string) {}

  append(incidentId: string, body: EventBody): IncidentEvent {
    const folder = join(this.stateDir, 'incidents', incidentId);
    mkdirSync(folder, { recursive: true });
    const path = join(folder, 'events.jsonl');
    const sequence = countEvents(path) + 1;
    const event = { id: randomUUID(), incidentId, sequence, occurredAt: new Date().toISOString(), ...body };
    appendFileSync(path, `${JSON.stringify(event)}\n`);
    return event;
  }
}
