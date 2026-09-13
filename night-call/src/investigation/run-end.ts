import type { Snapshot } from './snapshot';

export const RUN_END_QUIET_MS = 2 * 60_000;

export function quietMs(snapshot: Snapshot, nowMs: number): number {
  const lastActivity = Date.parse(snapshot.lastAgentActivityAt ?? '');
  return Number.isNaN(lastActivity) ? 0 : nowMs - lastActivity;
}

export function settleEndedRun(snapshot: Snapshot, nowMs: number): Snapshot {
  const leadFinished = snapshot.roles.lead.status === 'finished';
  const ended = snapshot.investigation === 'running' && leadFinished && quietMs(snapshot, nowMs) >= RUN_END_QUIET_MS;
  return ended ? { ...snapshot, investigation: 'stopped', investigationChangedAt: snapshot.lastAgentActivityAt } : snapshot;
}
