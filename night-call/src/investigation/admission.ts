import { BadRequestException, ConflictException } from '@nestjs/common';

import { matchesCurrentRun, type RunIds } from './current-run';
import type { EventDraft, EventType, IncidentEvent } from './event-types';
import { reduceEvents } from './reduce-events';
import { hasRecordedContradiction } from './run-causes';
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

function requireSingleStop(snapshot: Snapshot, draft: EventDraft): void {
  if (draft.type !== 'investigation_stopped') return;
  if (snapshot.investigationStop) throw new ConflictException('investigation_stopped was already recorded for this incident');
  if (draft.payload.summary === draft.summary) return;
  throw new BadRequestException('investigation_stopped summary must be identical in the event and the payload');
}

function requireUncontradictedSupport(snapshot: Snapshot, draft: EventDraft): void {
  if (draft.type !== 'hypothesis_status_changed' || draft.payload.status !== 'supported') return;
  if (!hasRecordedContradiction(snapshot, draft.payload.hypothesisId)) return;
  throw new ConflictException('a cause cannot be marked supported while recorded evidence it cites contradicts it');
}

export function admit(events: IncidentEvent[], draft: EventDraft): EventDraft {
  const snapshot = reduceEvents(events);
  if (snapshot?.incident.lifecycle !== 'active') throw new ConflictException('incident is not active');
  requireSingleStop(snapshot, draft);
  requireUncontradictedSupport(snapshot, draft);
  requireCurrentRun(snapshot, draft);
  requireCurrentMitigation(snapshot, draft);
  requireVerifiedBeforePublishing(snapshot, draft);
  return draft;
}
