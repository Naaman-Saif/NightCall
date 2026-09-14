import type { CauseStatus, RunCause, RunStatus } from '../api/contract';

export const CAUSE_STATUS_TEXT: Record<CauseStatus, string> = {
  verified: 'Reproduced, and the fix passed 3 of 3 rounds',
  reproduced: 'Reproduced in a test copy',
  supported: 'Most likely, not yet reproduced',
  proposed: 'Possible',
  contradicted: 'Ruled out',
};

const CAUSE_ORDER: Record<CauseStatus, number> = { verified: 0, reproduced: 1, supported: 2, proposed: 3, contradicted: 4 };
const UNKNOWN_STATUS_ORDER = 5;

function orderOf(cause: RunCause): number {
  return CAUSE_ORDER[cause.status] ?? UNKNOWN_STATUS_ORDER;
}

export function sortCauses(causes: RunCause[]): RunCause[] {
  return [...causes].sort((first, second) => orderOf(first) - orderOf(second));
}

export function isRunOver(status: RunStatus): boolean {
  return status !== 'running' && status !== 'not_started';
}
