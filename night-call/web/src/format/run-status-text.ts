import type { Incident, RunReport, RunStatus } from '../api/contract';
import { formatTimeOfDay } from './time';

type StatusText = (report: RunReport, clock: string | null) => string;

const STATUS_TEXT: Record<RunStatus, StatusText> = {
  not_started: () => 'Not started',
  running: (report) => (report.nowDoing ? `Running: ${report.nowDoing}` : 'Running'),
  stopped: (_, clock) => (clock ? `Stopped at ${clock}` : 'Stopped'),
  stalled: (_, clock) => (clock ? `Stalled: no activity since ${clock}` : 'Stalled: no recent activity'),
  interrupted: (_, clock) => (clock ? `Interrupted at ${clock}` : 'Interrupted'),
};

function clockOf(statusAt: string | null): string | null {
  if (!statusAt || Number.isNaN(Date.parse(statusAt))) return null;
  return `${formatTimeOfDay(statusAt).slice(0, 5)} UTC`;
}

const CLOSED_BECAUSE: Record<NonNullable<Incident['completionReason']>, string> = {
  interrupted: 'by a NightCall restart',
  budget_exhausted: 'when the time budget ran out',
  completed: 'after the investigation completed',
  insufficient_evidence: 'without enough evidence',
  infrastructure_failure: 'after an infrastructure failure',
};

export function describeIncidentClosing(incident: Incident, report: RunReport): string | null {
  if (incident.lifecycle !== 'finished') return null;
  const closedAt = clockOf(incident.lastActivityAt);
  const isClosedAfterRun = !report.statusAt || Date.parse(incident.lastActivityAt) > Date.parse(report.statusAt);
  if (!closedAt || !isClosedAfterRun) return null;
  const reason = incident.completionReason ? ` ${CLOSED_BECAUSE[incident.completionReason] ?? ''}` : '';
  return `Incident closed at ${closedAt}${reason.trimEnd()}.`;
}

export function describeRunStatus(report: RunReport): string {
  const describe = STATUS_TEXT[report.status] ?? STATUS_TEXT.not_started;
  return describe(report, clockOf(report.statusAt));
}
