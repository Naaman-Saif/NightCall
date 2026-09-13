import type { RunStatus } from './run-report-types';
import type { EvidenceItem, InvestigationState, Snapshot } from './snapshot';

export const NOT_DONE = ['Looking for the cause', 'Reproducing the crash in a test copy', 'Testing a fix'];
export const ERROR_NOTE = 'The run stopped because of an error.';
export const INFERRED_STOP_NOTE = 'The lead reported finished and no agent activity followed for 2 minutes, so NightCall shows the run as stopped.';

const STATUS_BY_STATE: Record<InvestigationState, RunStatus> = {
  not_started: 'not_started',
  running: 'running',
  stopped: 'stopped',
  stalled: 'stalled',
  interrupted: 'interrupted',
  finished: 'stopped',
};

function statusAtOf(snapshot: Snapshot): string {
  if (snapshot.investigation === 'stalled') return snapshot.lastAgentActivityAt ?? snapshot.incident.startedAt;
  return snapshot.investigationChangedAt ?? snapshot.incident.startedAt;
}

function nowDoingOf(snapshot: Snapshot): string | null {
  if (snapshot.investigation !== 'running') return null;
  const updated = Object.values(snapshot.roles).filter((role) => role.updatedAt !== null);
  const latest = updated.sort((first, second) => String(first.updatedAt).localeCompare(String(second.updatedAt))).at(-1);
  return latest?.assignment || null;
}

function readingOf(item: EvidenceItem): string {
  return item.kind === 'logs' && item.source.startsWith('span metrics') ? 'failure_rate' : item.kind;
}

function foundOf(snapshot: Snapshot): string[] {
  const latestByReading = new Map<string, string>();
  for (const item of Object.values(snapshot.evidence)) latestByReading.set(readingOf(item), item.summary);
  return [...latestByReading.values()];
}

function noteOf(snapshot: Snapshot): string | null {
  if (snapshot.investigation !== 'stopped') return null;
  if (snapshot.investigationStop === null) return INFERRED_STOP_NOTE;
  return snapshot.investigationStop.reason === 'error' ? ERROR_NOTE : null;
}

export function withRunReport(snapshot: Snapshot): Snapshot {
  const status = STATUS_BY_STATE[snapshot.investigation];
  const timing = { status, statusAt: statusAtOf(snapshot), note: noteOf(snapshot) };
  const derived = { ...timing, nowDoing: nowDoingOf(snapshot), found: foundOf(snapshot), notDone: [...NOT_DONE] };
  return { ...snapshot, runReport: { ...snapshot.runReport, ...derived } };
}
