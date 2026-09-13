import type { IncidentEvent, Mitigation, Snapshot } from '../api/contract';
import { belongsToCurrentRun, proofIsComplete, withCycle, withMitigationStatus } from './proof-rules';
import { reducerFrom } from './reducer-table';

function proposeMitigation(snapshot: Snapshot, event: IncidentEvent<'mitigation_proposed'>): Snapshot {
  const { mitigationId, explanation, diff, caveats, notFixed } = event.payload;
  const previous = snapshot.mitigation;
  const replaced = previous ? [{ id: previous.id, explanation: previous.explanation, supersededAt: event.occurredAt }] : [];
  const mitigation: Mitigation = { id: mitigationId, explanation, diff, caveats, notFixed, status: 'proposed' };
  const supersededMitigations = [...snapshot.supersededMitigations, ...replaced];
  return { ...snapshot, mitigation, supersededMitigations, currentVerificationRun: null, cycles: [], verification: null };
}

function startVerification(snapshot: Snapshot, event: IncidentEvent<'verification_started'>): Snapshot {
  const { verificationRunId, mitigationId, contractId } = event.payload;
  const currentVerificationRun = { verificationRunId, mitigationId, contractId, startedAt: event.occurredAt };
  const mitigation = withMitigationStatus(snapshot, 'testing');
  return { ...snapshot, mitigation, currentVerificationRun, cycles: [], verification: null };
}

function startCycle(snapshot: Snapshot, event: IncidentEvent<'cycle_started'>): Snapshot {
  const { cycle, verificationRunId } = event.payload;
  if (!belongsToCurrentRun(snapshot, event.payload)) return snapshot;
  const cycles = withCycle(snapshot.cycles, { number: cycle, state: 'running', checks: [], verificationRunId });
  return { ...snapshot, cycles };
}

function finishCycle(snapshot: Snapshot, event: IncidentEvent<'cycle_finished'>): Snapshot {
  const { cycle, passed, checks, verificationRunId } = event.payload;
  if (!belongsToCurrentRun(snapshot, event.payload)) return snapshot;
  const state = passed ? 'passed' : 'failed';
  const finished = { ...snapshot, cycles: withCycle(snapshot.cycles, { number: cycle, state, checks, verificationRunId }) };
  if (passed) return finished;
  return { ...finished, mitigation: withMitigationStatus(finished, 'failed') };
}

function reviewVerification(snapshot: Snapshot, event: IncidentEvent<'verification_reviewed'>): Snapshot {
  const { verificationRunId, approved, reasons } = event.payload;
  if (!belongsToCurrentRun(snapshot, event.payload)) return snapshot;
  const reviewed = { ...snapshot, verification: { verificationRunId, approved, reasons } };
  if (!proofIsComplete(reviewed)) return reviewed;
  return { ...reviewed, mitigation: withMitigationStatus(reviewed, 'verified') };
}

export const reduceProof = reducerFrom({
  mitigation_proposed: proposeMitigation,
  verification_started: startVerification,
  cycle_started: startCycle,
  cycle_finished: finishCycle,
  verification_reviewed: reviewVerification,
});
