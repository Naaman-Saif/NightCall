import { readFileSync, writeFileSync } from 'node:fs';

import { recoverAndInterrupt } from './boot-interruption';
import { readSnapshot } from './incident-catalog';
import { incidentFolder, snapshotPath } from './incident-paths';
import { recordedRun } from './run.fixture';
import type { Snapshot } from './snapshot';
import { SNAPSHOT_VERSION } from './snapshot-version';

function storedFile(path: string): Snapshot {
  return JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
}

function writeOldBuildSnapshot(path: string): void {
  const current = storedFile(path);
  const answered = current.runReport.did.map((step) => ({ ...step, value: `Answer: ${step.value}` }));
  const oldReport = { ...current.runReport, did: answered, note: 'The lead reported finished' };
  const { snapshotVersion, ...withoutVersion } = { ...current, runReport: oldReport };
  expect(snapshotVersion).toBe(SNAPSHOT_VERSION);
  writeFileSync(path, JSON.stringify(withoutVersion));
}

describe('snapshot version', () => {
  it('rebuilds a snapshot stored by an older build instead of serving its stale wording', async () => {
    const { writer, incidentId } = await recordedRun([]);
    const path = snapshotPath(incidentFolder(writer.stateDir, incidentId));
    writeOldBuildSnapshot(path);
    const snapshot = readSnapshot(writer.stateDir, incidentId);
    expect(snapshot?.snapshotVersion).toBe(SNAPSHOT_VERSION);
    expect(snapshot?.runReport.did.at(-1)?.value).toBe('Tolerable');
    expect(snapshot?.runReport.causes).toEqual([]);
  });

  it('rewrites stale snapshot files when NightCall starts', async () => {
    const { writer, incidentId } = await recordedRun([]);
    const path = snapshotPath(incidentFolder(writer.stateDir, incidentId));
    writeOldBuildSnapshot(path);
    await recoverAndInterrupt(writer);
    expect(storedFile(path).snapshotVersion).toBe(SNAPSHOT_VERSION);
  });
});
