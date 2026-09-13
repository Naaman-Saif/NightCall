import type { Attention, Incident, Phase } from '../api/contract';
import { formatDuration } from './time';

type PhaseFacts = Pick<Incident, 'lifecycle' | 'phase'> & { completionReason?: Incident['completionReason'] };

const PHASE_TEXT: Record<Phase, string> = {
  briefing: 'Briefing',
  investigating: 'Investigating',
  reproducing: 'Reproducing in the sandbox',
  mitigating: 'Preparing a mitigation',
  verifying: 'Verifying the mitigation',
  publishing: 'Opening the pull request',
  handoff: 'Handoff',
};

const COMPLETION_TEXT: Record<NonNullable<Incident['completionReason']>, string> = {
  completed: 'completed',
  budget_exhausted: 'budget used up',
  insufficient_evidence: 'insufficient evidence',
  infrastructure_failure: 'infrastructure failure',
  interrupted: 'interrupted',
};

const ATTENTION_TEXT: Record<Attention, string> = {
  none: 'No question waiting',
  context_requested: 'Question waiting',
  blocked: 'Mitigation waits on an answer',
};

export function describePhase(facts: PhaseFacts): string {
  if (facts.lifecycle === 'active') return PHASE_TEXT[facts.phase] ?? facts.phase;
  if (!facts.completionReason) return 'Finished';
  return `Finished, ${COMPLETION_TEXT[facts.completionReason]}`;
}

export function describeAttention(attention: Attention): string {
  return ATTENTION_TEXT[attention];
}

export function describeElapsed(incident: Incident, now: number): string {
  const end = incident.lifecycle === 'finished' ? Date.parse(incident.lastActivityAt) : now;
  return formatDuration(end - Date.parse(incident.startedAt));
}

export function describeBudgetLeft(incident: Incident, now: number): string {
  if (incident.lifecycle === 'finished') return 'Stopped';
  const left = Date.parse(incident.deadlineAt) - now;
  return left > 0 ? formatDuration(left) : 'Budget used';
}
