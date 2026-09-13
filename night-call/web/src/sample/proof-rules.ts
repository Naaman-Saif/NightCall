import type { Cycle, Mitigation, Snapshot, VerificationRunIds } from '../api/contract';

const REQUIRED_ROUNDS = [1, 2, 3];

export function belongsToCurrentRun(snapshot: Snapshot, ids: VerificationRunIds): boolean {
  const run = snapshot.currentVerificationRun;
  if (!run) return false;
  const isSameRun = run.verificationRunId === ids.verificationRunId;
  return isSameRun && run.mitigationId === ids.mitigationId && run.contractId === ids.contractId;
}

export function withMitigationStatus(snapshot: Snapshot, status: Mitigation['status']): Mitigation | null {
  return snapshot.mitigation ? { ...snapshot.mitigation, status } : null;
}

export function withCycle(cycles: Cycle[], cycle: Cycle): Cycle[] {
  const others = cycles.filter((known) => known.number !== cycle.number);
  return [...others, cycle].sort((first, second) => first.number - second.number);
}

export function proofIsComplete(snapshot: Snapshot): boolean {
  const runId = snapshot.currentVerificationRun?.verificationRunId;
  const passedRounds = snapshot.cycles
    .filter((cycle) => cycle.state === 'passed' && cycle.verificationRunId === runId)
    .map((cycle) => cycle.number);
  const allRoundsPassed = REQUIRED_ROUNDS.every((round) => passedRounds.includes(round));
  const isApprovedForRun = snapshot.verification?.verificationRunId === runId && snapshot.verification?.approved === true;
  return allRoundsPassed && isApprovedForRun;
}
