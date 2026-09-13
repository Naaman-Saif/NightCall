import type { Snapshot } from './snapshot';

export type RunIds = { verificationRunId: string; mitigationId: string; contractId: string };

export function matchesCurrentRun(snapshot: Snapshot, ids: RunIds): boolean {
  const run = snapshot.currentVerificationRun;
  if (!run) return false;
  const sameRun = run.verificationRunId === ids.verificationRunId;
  return sameRun && run.mitigationId === ids.mitigationId && run.contractId === ids.contractId;
}

export function runIsVerified(snapshot: Snapshot): boolean {
  const run = snapshot.currentVerificationRun;
  if (!run) return false;
  const passed = [1, 2, 3].every((number) =>
    snapshot.cycles.some((cycle) => cycle.number === number && cycle.state === 'passed'),
  );
  const approval = snapshot.verification;
  return passed && approval?.approved === true && approval.verificationRunId === run.verificationRunId;
}
