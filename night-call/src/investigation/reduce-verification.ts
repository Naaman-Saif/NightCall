import { matchesCurrentRun, runIsVerified } from './current-run';
import type { IncidentEvent } from './event-types';
import { payloadOf } from './payload-schemas';
import type { Cycle } from './proof-snapshot';
import { reducerFrom } from './reducer';
import type { Snapshot } from './snapshot';

type CycleChange = { number: number; change: Partial<Cycle> };

function changeCycle(snapshot: Snapshot, update: CycleChange): Snapshot {
  const cycles = snapshot.cycles.map((cycle) => (cycle.number === update.number ? { ...cycle, ...update.change } : cycle));
  return { ...snapshot, cycles };
}

function withMitigationStatus(snapshot: Snapshot): Snapshot {
  const mitigation = snapshot.mitigation;
  if (!mitigation || mitigation.status === 'failed') return snapshot;
  const status = runIsVerified(snapshot) ? ('verified' as const) : mitigation.status;
  return { ...snapshot, mitigation: { ...mitigation, status } };
}

function startCycle(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const payload = payloadOf(event, 'cycle_started');
  if (!matchesCurrentRun(snapshot, payload)) return snapshot;
  return changeCycle(snapshot, { number: payload.cycle, change: { state: 'running' } });
}

function finishCycle(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const payload = payloadOf(event, 'cycle_finished');
  if (!matchesCurrentRun(snapshot, payload)) return snapshot;
  const change = { state: payload.passed ? ('passed' as const) : ('failed' as const), checks: payload.checks };
  const changed = changeCycle(snapshot, { number: payload.cycle, change });
  const mitigation = changed.mitigation;
  if (payload.passed || !mitigation) return withMitigationStatus(changed);
  return { ...changed, mitigation: { ...mitigation, status: 'failed' } };
}

function reviewVerification(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { verificationRunId, mitigationId, contractId, approved, reasons } = payloadOf(event, 'verification_reviewed');
  if (!matchesCurrentRun(snapshot, { verificationRunId, mitigationId, contractId })) return snapshot;
  return withMitigationStatus({ ...snapshot, verification: { verificationRunId, approved, reasons } });
}

export const reduceVerification = reducerFrom({
  cycle_started: startCycle,
  cycle_finished: finishCycle,
  verification_reviewed: reviewVerification,
});
