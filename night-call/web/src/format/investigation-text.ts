import type { InvestigationProgress, Snapshot } from '../api/contract';

const PROGRESS_TEXT: Record<Exclude<InvestigationProgress, 'finished'>, string> = {
  not_started: 'Investigation not started.',
  running: 'Investigation running: gathering evidence.',
  stopped: 'Investigation stopped.',
  stalled: 'Investigation stalled: no recent activity.',
  interrupted: 'Investigation interrupted before analysis completed.',
};

export function investigationOf(snapshot: Snapshot): InvestigationProgress {
  return snapshot.investigation ?? 'not_started';
}

export function describeUnfinishedInvestigation(snapshot: Snapshot): string | null {
  const progress = investigationOf(snapshot);
  if (progress === 'finished') return null;
  return PROGRESS_TEXT[progress] ?? PROGRESS_TEXT.not_started;
}

export function describeMissingCauses(snapshot: Snapshot): string {
  return describeUnfinishedInvestigation(snapshot) ?? 'No possible cause was established.';
}

export function describeMissingBrief(snapshot: Snapshot): string {
  return describeUnfinishedInvestigation(snapshot) ?? 'Investigation finished without a summary.';
}
