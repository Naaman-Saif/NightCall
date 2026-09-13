import { existsSync, readdirSync } from 'node:fs';

import { logStartsWithAlert, readLog } from './event-lines';
import { incidentFolder, incidentsRoot } from './incident-paths';
import { reduceEvents } from './reduce-events';
import type { Snapshot } from './snapshot';
import { readSnapshotFile, snapshotMatchesLog } from './snapshot-file';

export function incidentIds(stateDir: string): string[] {
  const root = incidentsRoot(stateDir);
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((id) => logStartsWithAlert(readLog(incidentFolder(stateDir, id))));
}

export function readSnapshot(stateDir: string, incidentId: string): Snapshot | null {
  const folder = incidentFolder(stateDir, incidentId);
  const { events } = readLog(folder);
  const stored = readSnapshotFile(folder);
  return snapshotMatchesLog(stored, events) ? stored : reduceEvents(events);
}

export function allSnapshots(stateDir: string): Snapshot[] {
  return incidentIds(stateDir)
    .map((id) => readSnapshot(stateDir, id))
    .filter((snapshot): snapshot is Snapshot => snapshot !== null);
}
