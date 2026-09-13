import type { InvestigationState, Snapshot } from './snapshot';

const FIXED_SENTENCES: Record<InvestigationState, string> = {
  not_started: 'Investigation has not started.',
  running: 'Investigation is running.',
  stopped: 'Investigation stopped.',
  stalled: 'Investigation stalled.',
  interrupted: 'Investigation was interrupted before analysis completed.',
  finished: 'Investigation finished.',
};

export function clock(iso: string | null): string {
  const moment = Date.parse(iso ?? '');
  return Number.isNaN(moment) ? 'an unknown time' : `${new Date(moment).toISOString().slice(11, 16)} UTC`;
}

export function investigationSentence(snapshot: Snapshot): string {
  if (snapshot.investigation === 'stalled') return `Investigation stalled with no agent activity since ${clock(snapshot.lastAgentActivityAt)}.`;
  return FIXED_SENTENCES[snapshot.investigation];
}
