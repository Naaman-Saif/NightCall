import { readLog } from '../investigation/event-lines';
import { incidentFolder } from '../investigation/incident-paths';
import type { Snapshot } from '../investigation/snapshot';

export const PUBLISH_LABEL = 'nightcall_publish';
export const TEST_INCIDENT_NOTE = 'Test incident: no pull request';

export function pullRequestAllowed(stateDir: string, snapshot: Snapshot): boolean {
  if (!snapshot.incident.illustrative) return true;
  const alert = readLog(incidentFolder(stateDir, snapshot.incident.id)).events[0];
  const labels = (alert?.payload.labels ?? {}) as Record<string, string>;
  return labels[PUBLISH_LABEL] === 'true';
}
