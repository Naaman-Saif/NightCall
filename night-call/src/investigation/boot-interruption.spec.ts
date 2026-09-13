import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

import { recoverAndInterrupt } from './boot-interruption';
import { readLog } from './event-lines';
import { incidentIds, readSnapshot } from './incident-catalog';
import { eventsPath, incidentFolder, snapshotPath } from './incident-paths';
import { freshWriter, openIncident } from './writer.fixture';

const oldEvent = { id: 'x', incidentId: 'hello-01', sequence: 1, occurredAt: 'then', actor: 'lead', type: 'role_status_changed', summary: 'hi', refs: [], payload: {} };

describe('boot interruption', () => {
  it('marks active incidents interrupted and leaves finished ones alone', async () => {
    const writer = freshWriter();
    const active = await openIncident(writer);
    const finished = await openIncident(writer);
    const draft = { actor: 'system' as const, type: 'investigation_finished' as const, summary: 'done', refs: [] };
    await writer.update(finished, () => ({ ...draft, payload: { reason: 'completed' } }));
    const interrupted = await recoverAndInterrupt(writer);
    expect(interrupted.map((event) => event.incidentId)).toEqual([active]);
    expect(readSnapshot(writer.stateDir, active)?.incident.completionReason).toBe('interrupted');
    expect(readSnapshot(writer.stateDir, finished)?.incident.completionReason).toBe('completed');
    expect(readLog(incidentFolder(writer.stateDir, finished)).events).toHaveLength(2);
  });

  it('ignores folders without alert_received', async () => {
    const writer = freshWriter();
    const folder = incidentFolder(writer.stateDir, 'hello-01');
    mkdirSync(folder, { recursive: true });
    writeFileSync(eventsPath(folder), `${JSON.stringify(oldEvent)}\n`);
    await recoverAndInterrupt(writer);
    expect(readLog(folder).events).toHaveLength(1);
    expect(existsSync(snapshotPath(folder))).toBe(false);
    expect(incidentIds(writer.stateDir)).toEqual([]);
    expect(readSnapshot(writer.stateDir, 'hello-01')).toBeNull();
  });
});
