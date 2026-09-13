import type { EventDraft, IncidentEvent } from './event-types';
import type { EventWriter } from './event-writer';
import { incidentIds } from './incident-catalog';
import { incidentFolder } from './incident-paths';
import { incidentIsActive } from './reduce-events';
import { readSnapshotFile, writeSnapshot } from './snapshot-file';
import { snapshotIsCurrent } from './snapshot-version';
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
  if (!snapshotIsCurrent(readSnapshotFile(folder), events)) writeSnapshot(folder, events);
}

async function interruptIfActive(writer: EventWriter, incidentId: string): Promise<IncidentEvent | null> {
  let appended = false;
  const event = await writer.update(incidentId, (events) => {
    if (!incidentIsActive(events)) return events[events.length - 1];
    appended = true;
    return interruption;
  });
  return appended ? event : null;
}

export async function recoverAndInterrupt(writer: EventWriter): Promise<IncidentEvent[]> {
  const ids = incidentIds(writer.stateDir);
  ids.forEach((id) => recoverFolder(incidentFolder(writer.stateDir, id)));
  const outcomes = await Promise.all(ids.map((id) => interruptIfActive(writer, id)));
  return outcomes.filter((event): event is IncidentEvent => event !== null);
}
