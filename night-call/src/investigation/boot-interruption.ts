import type { EventDraft, IncidentEvent } from './event-types';
import type { EventWriter } from './event-writer';
import { incidentIds } from './incident-catalog';
import { incidentFolder } from './incident-paths';
import { incidentIsActive } from './reduce-events';
import { readSnapshotFile, snapshotMatchesLog, writeSnapshot } from './snapshot-file';
import { recoverLog } from './tail-recovery';

const interruption: EventDraft = {
  actor: 'system',
  type: 'investigation_finished',
  summary: 'Investigation interrupted because Night Call restarted',
  refs: [],
  payload: { reason: 'interrupted' },
};

function recoverFolder(folder: string): void {
  const events = recoverLog(folder);
  if (!snapshotMatchesLog(readSnapshotFile(folder), events)) writeSnapshot(folder, events);
}

function interruptionPlan(events: IncidentEvent[]): EventDraft | IncidentEvent {
  return incidentIsActive(events) ? interruption : events[events.length - 1];
}

export async function recoverAndInterrupt(writer: EventWriter): Promise<IncidentEvent[]> {
  const ids = incidentIds(writer.stateDir);
  ids.forEach((id) => recoverFolder(incidentFolder(writer.stateDir, id)));
  const outcomes = await Promise.all(ids.map((id) => writer.update(id, interruptionPlan)));
  return outcomes.filter((event) => event.type === 'investigation_finished' && event.payload.reason === 'interrupted');
}
