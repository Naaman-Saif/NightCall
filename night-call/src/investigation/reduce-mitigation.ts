import type { IncidentEvent } from './event-types';
import { payloadOf } from './payload-schemas';
import { plainPayload } from './plain-payload';
import type { Cycle, SupersededMitigation } from './proof-snapshot';
import { reducerFrom } from './reducer';
import type { Snapshot } from './snapshot';

function supersededBy(snapshot: Snapshot, event: IncidentEvent): SupersededMitigation[] {
  const previous = snapshot.mitigation;
  if (!previous) return snapshot.supersededMitigations;
  const superseded = { id: previous.id, explanation: previous.explanation, supersededAt: event.occurredAt };
  return [...snapshot.supersededMitigations, superseded];
}

function proposeMitigation(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { mitigationId, ...proposed } = plainPayload(payloadOf(event, 'mitigation_proposed'));
  const mitigation = { id: mitigationId, ...proposed, status: 'proposed' as const };
  const supersededMitigations = supersededBy(snapshot, event);
  const clearedProof = { currentVerificationRun: null, cycles: [], verification: null };
  return { ...snapshot, mitigation, supersededMitigations, ...clearedProof };
}

function pendingCycles(verificationRunId: string): Cycle[] {
  return [1, 2, 3].map((number) => ({ number, state: 'pending', checks: [], verificationRunId, speed: null }));
}

function startVerification(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const ids = plainPayload(payloadOf(event, 'verification_started'));
  const mitigation = snapshot.mitigation;
  if (!mitigation || mitigation.id !== ids.mitigationId) return snapshot;
  const currentVerificationRun = { ...ids, startedAt: event.occurredAt };
  const cycles = pendingCycles(ids.verificationRunId);
  const testing = { ...mitigation, status: 'testing' as const };
  return { ...snapshot, currentVerificationRun, cycles, verification: null, mitigation: testing };
}

export const reduceMitigation = reducerFrom({
  mitigation_proposed: proposeMitigation,
  verification_started: startVerification,
});
