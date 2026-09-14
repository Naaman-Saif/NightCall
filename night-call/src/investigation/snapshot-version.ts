import type { IncidentEvent } from './event-types';
import type { Snapshot } from './snapshot';

export const SNAPSHOT_VERSION = 7;

export function snapshotIsCurrent(snapshot: Snapshot | null, events: IncidentEvent[]): snapshot is Snapshot {
  return snapshot !== null && snapshot.lastSequence === events.length && snapshot.snapshotVersion === SNAPSHOT_VERSION;
}
