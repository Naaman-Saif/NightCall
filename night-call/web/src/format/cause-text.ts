import type { CauseStatus, RunCause, RunStatus } from '../api/contract';

export const CAUSE_STATUS_TEXT: Record<CauseStatus, string> = {
  supported: 'Most likely, not yet reproduced',
  proposed: 'Possible',
  contradicted: 'Ruled out',
};

const CAUSE_ORDER: Record<CauseStatus, number> = { supported: 0, proposed: 1, contradicted: 2 };
const UNKNOWN_STATUS_ORDER = 3;

function orderOf(cause: RunCause): number {
  return CAUSE_ORDER[cause.status] ?? UNKNOWN_STATUS_ORDER;
}

export function sortCauses(causes: RunCause[]): RunCause[] {
  return [...causes].sort((first, second) => orderOf(first) - orderOf(second));
}

export function isRunOver(status: RunStatus): boolean {
  return status !== 'running' && status !== 'not_started';
}
