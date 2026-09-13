import type { Cycle, Mitigation } from '../api/contract';
import type { CycleTile } from '../kit';

const ROUND_NUMBERS = [1, 2, 3];

export const MITIGATION_STATUS_TEXT: Record<Mitigation['status'], string> = {
  proposed: 'Proposed, not tested yet',
  testing: 'Verification in progress',
  failed: 'A verification round failed',
  verified: 'Mitigation verified',
};

function tileFor(cycle: Cycle | undefined): CycleTile {
  if (!cycle) return { state: 'pending', detail: 'not started' };
  if (cycle.state === 'running' || cycle.state === 'pending') return { state: cycle.state, detail: cycle.state };
  const passedChecks = cycle.checks.filter((check) => check.passed).length;
  const total = cycle.checks.length;
  if (cycle.state === 'failed') return { state: 'failed', detail: `${total - passedChecks} of ${total} checks failed` };
  return { state: 'passed', detail: `${passedChecks} of ${total} checks passed` };
}

export function cycleTiles(cycles: Cycle[]): CycleTile[] {
  return ROUND_NUMBERS.map((round) => tileFor(cycles.find((cycle) => cycle.number === round)));
}

export function countPassedRounds(cycles: Cycle[]): number {
  return cycles.filter((cycle) => cycle.state === 'passed').length;
}
