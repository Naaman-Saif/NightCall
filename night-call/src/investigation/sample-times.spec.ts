import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { EventDraft } from './event-types';
import { retimedDrafts } from './sample-times';

const fixturePath = join(__dirname, '../../web/public/fixtures/sample-incident.json');
const replayAlertAt = '2026-09-13T16:00:00.000Z';

function minutesBefore(iso: unknown): number {
  return (Date.parse(replayAlertAt) - Date.parse(String(iso))) / 60_000;
}

function draft(type: EventDraft['type'], payload: Record<string, unknown>): EventDraft & { delayMs: number } {
  return { actor: 'system', type, summary: type, refs: [], payload, delayMs: 1500 };
}

describe('sample replay times', () => {
  it('places the fixture evidence minutes before the alert and the deploy 12 minutes before', () => {
    const { events } = JSON.parse(readFileSync(fixturePath, 'utf8')) as { events: EventDraft[] };
    const [alert, ...rest] = events;
    const retimed = retimedDrafts(rest, { fixtureAlertAt: String(alert.payload.startedAt), replayAlertAt });
    const evidence = retimed.filter((event) => event.type === 'evidence_recorded');
    const deploy = evidence.find((event) => event.payload.kind === 'deploy_history');
    expect(minutesBefore(deploy?.payload.observedAt)).toBe(12);
    const others = evidence.filter((event) => event !== deploy).map((event) => minutesBefore(event.payload.observedAt));
    expect(others.every((minutes) => minutes >= 1 && minutes <= 5)).toBe(true);
    expect(JSON.stringify(retimed)).not.toContain('2026-09-13T00:');
  });

  it('shifts every other time by the replay offset, including nested ones, and keeps the rest', () => {
    const cycle = draft('cycle_finished', { finishedAt: '2026-09-13T00:02:00.000Z', samples: [{ at: '2026-09-13T00:01:30Z' }], note: 'x' });
    const [retimed] = retimedDrafts([cycle], { fixtureAlertAt: '2026-09-13T00:00:00.000Z', replayAlertAt });
    expect(retimed.payload).toEqual({ finishedAt: '2026-09-13T16:02:00.000Z', samples: [{ at: '2026-09-13T16:01:30.000Z' }], note: 'x' });
    expect(retimed.delayMs).toBe(1500);
  });
});
