import { readFileSync } from 'node:fs';

import type { IncidentEvent } from './event-types';
import { snapshotPath } from './incident-paths';
import { reduceEvents } from './reduce-events';
import { replaceFile } from './replace-file';
import type { Snapshot } from './snapshot';

export function writeSnapshot(folder: string, events: IncidentEvent[]): Snapshot | null {
  const snapshot = reduceEvents(events);
  if (snapshot) replaceFile(snapshotPath(folder), `${JSON.stringify(snapshot, null, 2)}\n`);
  return snapshot;
}

export function readSnapshotFile(folder: string): Snapshot | null {
  try {
    return JSON.parse(readFileSync(snapshotPath(folder), 'utf8')) as Snapshot;
  } catch {
    return null;
  }
}

export function snapshotMatchesLog(snapshot: Snapshot | null, events: IncidentEvent[]): boolean {
  return snapshot !== null && snapshot.lastSequence === events.length;
}
