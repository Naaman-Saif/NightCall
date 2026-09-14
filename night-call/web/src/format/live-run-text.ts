import type { LiveRun, LiveStage } from '../api/live-run';
import { speedSuffix } from './traffic-text';

type StepText = (live: LiveRun) => string;

function lastKillRequest(live: LiveRun): number | null {
  return live.oomKills.at(-1)?.atRequest ?? null;
}

function replayingText(live: LiveRun): string {
  const planned = live.requestsPlanned === null ? '' : ` of ${live.requestsPlanned}`;
  return `Replaying request ${live.requestsSent}${planned}${speedSuffix(live.speed)}`;
}

function outOfMemoryText(live: LiveRun, after: string): string {
  const atRequest = lastKillRequest(live);
  return atRequest === null ? `Out of memory${after}` : `Out of memory at request ${atRequest}${after}`;
}

const STEP_TEXT: Record<LiveStage, StepText> = {
  starting_copy: () => 'Starting a sealed copy of the shop',
  copy_ready: () => 'Sealed copy of the shop is ready',
  replaying: replayingText,
  restarting: (live) => outOfMemoryText(live, ', restarting'),
  fault_seen: (live) => outOfMemoryText(live, ''),
  stopping_copy: () => 'Stopping the sealed copy',
  cleaned: () => 'Sealed copy removed',
  failed: () => 'The run failed',
};

export function describeLiveStep(live: LiveRun): string {
  const describe = STEP_TEXT[live.stage];
  return describe ? describe(live) : live.stage;
}

export function describeLiveMemory(live: LiveRun): string {
  const { latest, limit } = live.memoryMiB;
  const current = latest === null ? 'not measured' : `${Math.round(latest)} MiB`;
  return limit === null ? `Memory ${current}` : `Memory ${current} of ${Math.round(limit)} MiB limit`;
}

export function describeLiveProgress(live: LiveRun): string {
  const planned = live.requestsPlanned === null ? '' : ` of ${live.requestsPlanned}`;
  const errors = live.errors === 1 ? '1 error' : `${live.errors} errors`;
  return `${live.requestsSent}${planned} requests sent, ${errors}`;
}

export function isFailedRequest(status: number | null): boolean {
  return status === null || status === 0 || status >= 400;
}

export function describeRequestStatus(status: number | null): string {
  return status === null || status === 0 ? 'no reply' : String(status);
}
