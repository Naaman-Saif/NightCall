import { ConflictException } from '@nestjs/common';

import { matchesCurrentRun, type RunIds } from './current-run';
import type { EventDraft, EventType, IncidentEvent } from './event-types';
import { reduceEvents } from './reduce-events';
import type { Snapshot } from './snapshot';

const runBoundTypes = new Set<EventType>(['cycle_started', 'cycle_finished', 'verification_reviewed']);

function requireCurrentRun(snapshot: Snapshot, draft: EventDraft): void {
  if (!runBoundTypes.has(draft.type)) return;
  if (matchesCurrentRun(snapshot, draft.payload as RunIds)) return;
  throw new ConflictException(`${draft.type} does not match the current verification run`);
}

function requireCurrentMitigation(snapshot: Snapshot, draft: EventDraft): void {
  if (draft.type !== 'verification_started') return;
  const { mitigationId, contractId } = draft.payload as RunIds;
  const mitigationMatches = snapshot.mitigation?.id === mitigationId;
  if (mitigationMatches && snapshot.contract?.id === contractId) return;
  throw new ConflictException('verification_started does not match the current mitigation and contract');
}

function requireVerifiedBeforePublishing(snapshot: Snapshot, draft: EventDraft): void {
  if (draft.type !== 'publication_changed' || draft.payload.state === 'failed') return;
  if (snapshot.mitigation?.status === 'verified') return;
  throw new ConflictException('publication refused: the mitigation is not verified');
}

export function admit(events: IncidentEvent[], draft: EventDraft): EventDraft {
  const snapshot = reduceEvents(events);
  if (snapshot?.incident.lifecycle !== 'active') throw new ConflictException('incident is not active');
  requireCurrentRun(snapshot, draft);
  requireCurrentMitigation(snapshot, draft);
  requireVerifiedBeforePublishing(snapshot, draft);
  return draft;
}
