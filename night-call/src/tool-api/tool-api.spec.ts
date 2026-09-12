import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bearerMatches } from './bearer.guard';
import { eventBodyShape } from './event-body';
import { EventLog } from './event-log';

describe('bearer guard', () => {
  it('accepts only the exact bearer token and refuses when no token is configured', () => {
    expect(bearerMatches('Bearer secret-value', 'secret-value')).toBe(true);
    expect(bearerMatches('Bearer wrong', 'secret-value')).toBe(false);
    expect(bearerMatches('', 'secret-value')).toBe(false);
    expect(bearerMatches('Bearer ', '')).toBe(false);
  });
});

describe('event log', () => {
  it('assigns increasing sequence numbers per incident', () => {
    const stateDir = mkdtempSync(join(tmpdir(), 'night-call-events-'));
    const log = new EventLog(stateDir);
    const body = eventBodyShape.parse({ actor: 'lead', type: 'role_status_changed', summary: 'hello' });
    expect(log.append('hello-01', body).sequence).toBe(1);
    expect(log.append('hello-01', body).sequence).toBe(2);
    const lines = readFileSync(join(stateDir, 'incidents', 'hello-01', 'events.jsonl'), 'utf8').trim().split('\n');
    expect(Object.keys(JSON.parse(lines[1]))).toEqual(
      ['id', 'incidentId', 'sequence', 'occurredAt', 'actor', 'type', 'summary', 'refs', 'payload'],
    );
  });

  it('refuses an event type outside the plan', () => {
    expect(eventBodyShape.safeParse({ actor: 'lead', type: 'run_shell', summary: 'x' }).success).toBe(false);
  });
});
