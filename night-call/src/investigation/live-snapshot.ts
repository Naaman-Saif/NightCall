import { withHeadline } from './headline';
import { proofJobIsRunning } from './job-running';
import { quietMs, settleEndedRun } from './run-end';
import { withRunReport } from './run-report';
import type { Snapshot } from './snapshot';

export const STALL_AFTER_MS = 5 * 60_000;

function refreshed(snapshot: Snapshot): Snapshot {
  return withHeadline(withRunReport(snapshot));
}

export function liveSnapshot(snapshot: Snapshot, nowMs: number): Snapshot {
  if (snapshot.investigation !== 'running' || snapshot.incident.lifecycle !== 'active') return snapshot;
  if (proofJobIsRunning(snapshot)) return snapshot;
  const settled = settleEndedRun(snapshot, nowMs);
  if (settled !== snapshot) return refreshed(settled);
  return quietMs(snapshot, nowMs) >= STALL_AFTER_MS ? refreshed({ ...snapshot, investigation: 'stalled' }) : snapshot;
}
