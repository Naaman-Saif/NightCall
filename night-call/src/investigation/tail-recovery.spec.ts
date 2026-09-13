import { appendFileSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { recoverAndInterrupt } from './boot-interruption';
import { readLog } from './event-lines';
import { EventWriter } from './event-writer';
import { eventsPath, incidentFolder, snapshotPath } from './incident-paths';
import { LiveStream } from './live-stream';
import { supplyContext } from './operator-context';
import { reduceEvents } from './reduce-events';
import { appendAsRole } from './role-append';
import { readSnapshotFile } from './snapshot-file';
import { freshWriter, impactQuestion, openIncident, toolBody } from './writer.fixture';

const HALF_LINE = '{"id":"half-written","seque';

async function answeredIncident(writer: EventWriter): Promise<string> {
  const incidentId = await openIncident(writer);
  await appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('question_asked', impactQuestion) });
  const answer = { questionId: 'q-impact', text: 'Tolerable for now', idempotencyKey: 'answer-1' };
  await supplyContext(writer, { incidentId, body: answer });
  return incidentId;
}

describe('tail recovery', () => {
  it('keeps a saved answer exactly once after a broken tail and a restart', async () => {
    const writer = freshWriter();
    const incidentId = await answeredIncident(writer);
    const folder = incidentFolder(writer.stateDir, incidentId);
    appendFileSync(eventsPath(folder), HALF_LINE);
    const interrupted = await recoverAndInterrupt(new EventWriter(writer.stateDir, new LiveStream()));
    const { events } = readLog(folder);
    expect(events.filter((event) => event.type === 'context_supplied')).toHaveLength(1);
    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3, 4]);
    expect(interrupted.map((event) => event.sequence)).toEqual([4]);
    const broken = readdirSync(folder).filter((name) => name.startsWith('events.broken-'));
    expect(broken).toHaveLength(1);
    expect(readFileSync(join(folder, broken[0]), 'utf8')).toBe(HALF_LINE);
    expect(readSnapshotFile(folder)).toEqual(reduceEvents(events));
    expect(readSnapshotFile(folder)?.questions[0].answer?.text).toBe('Tolerable for now');
  });

  it('recovers before the next append so the new sequence follows the last valid event', async () => {
    const writer = freshWriter();
    const incidentId = await answeredIncident(writer);
    const folder = incidentFolder(writer.stateDir, incidentId);
    appendFileSync(eventsPath(folder), HALF_LINE);
    const body = toolBody('role_status_changed', { role: 'lead', status: 'working', assignment: 'next' });
    const event = await appendAsRole(writer, { role: 'lead', incidentId, body });
    expect(event.sequence).toBe(4);
    expect(readLog(folder).content.split('\n').filter(Boolean)).toHaveLength(4);
  });

  it('rebuilds a missing snapshot at boot', async () => {
    const writer = freshWriter();
    const incidentId = await answeredIncident(writer);
    const folder = incidentFolder(writer.stateDir, incidentId);
    rmSync(snapshotPath(folder));
    await recoverAndInterrupt(writer);
    expect(readSnapshotFile(folder)).toEqual(reduceEvents(readLog(folder).events));
  });
});
