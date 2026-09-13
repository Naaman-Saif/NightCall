import { causesOf } from './run-causes';
import type { RunStatus } from './run-report-types';
import type { EvidenceItem, InvestigationState, Snapshot } from './snapshot';

export const NOT_DONE = ['Looking for the cause', 'Reproducing the crash in a test copy', 'Testing a fix'];
export const ERROR_NOTE = 'The run stopped because of an error.';
export const INFERRED_STOP_NOTE = 'The run reported finished and nothing followed for 2 minutes, so NightCall shows it as stopped.';

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
  const causes = causesOf(snapshot);
  const notDone = causes.length > 0 ? NOT_DONE.slice(1) : [...NOT_DONE];
  const timing = { status, statusAt: statusAtOf(snapshot), note: noteOf(snapshot) };
  const derived = { ...timing, nowDoing: nowDoingOf(snapshot), found: foundOf(snapshot), causes, notDone };
  return { ...snapshot, runReport: { ...snapshot.runReport, ...derived } };
}
