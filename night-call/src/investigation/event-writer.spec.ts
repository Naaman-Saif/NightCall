import { readLog } from './event-lines';
import { incidentFolder } from './incident-paths';
import { LiveStream } from './live-stream';
import { appendAsRole } from './role-append';
import { readSnapshotFile } from './snapshot-file';
import { freshWriter, openIncident, toolBody } from './writer.fixture';

function roleWork(step: number): Record<string, unknown> {
  return toolBody('role_status_changed', { role: 'lead', status: 'working', assignment: `step ${step}` });
}

describe('event writer', () => {
  it('serializes concurrent appends into one gapless sequence', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const posts = Array.from({ length: 25 }, (_, step) =>
      appendAsRole(writer, { role: 'lead', incidentId, body: roleWork(step) }),
    );
    const sequences = (await Promise.all(posts)).map((event) => event.sequence).sort((a, b) => a - b);
    expect(sequences).toEqual(Array.from({ length: 25 }, (_, index) => index + 2));
    const folder = incidentFolder(writer.stateDir, incidentId);
    expect(readLog(folder).events.map((event) => event.sequence)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
    expect(readSnapshotFile(folder)?.lastSequence).toBe(26);
  });

  it('publishes only after the line and the snapshot are written', async () => {
    const stream = new LiveStream();
    const writer = freshWriter(stream);
    const folder = incidentFolder(writer.stateDir, 'inc-001');
    const seen: number[][] = [];
    stream.subscribe('inc-001', () => seen.push([readLog(folder).events.length, Number(readSnapshotFile(folder)?.lastSequence)]));
    await openIncident(writer);
    expect(seen).toEqual([[1, 1]]);
  });

  it('labels incidents INC-001, INC-002 and uses the label as the id', async () => {
    const writer = freshWriter();
    expect(await openIncident(writer)).toBe('inc-001');
    expect(await openIncident(writer)).toBe('inc-002');
    expect(readSnapshotFile(incidentFolder(writer.stateDir, 'inc-002'))?.incident.label).toBe('INC-002');
  });
});
