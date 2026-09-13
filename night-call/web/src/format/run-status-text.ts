import type { RunReport, RunStatus } from '../api/contract';
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

export function describeRunStatus(report: RunReport): string {
  const describe = STATUS_TEXT[report.status] ?? STATUS_TEXT.not_started;
  return describe(report, clockOf(report.statusAt));
}
