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
  no_answer: 'No answer',
};

const MINUTE_MS = 60_000;

type AttentionFacts = Pick<Incident, 'lifecycle' | 'attention'>;

export function describePhase(facts: PhaseFacts): string {
  if (facts.lifecycle === 'active') return PHASE_TEXT[facts.phase] ?? facts.phase;
  if (!facts.completionReason) return 'Finished';
  return `Finished, ${COMPLETION_TEXT[facts.completionReason]}`;
}

export function describeAttention({ lifecycle, attention }: AttentionFacts): string {
  const isUnansweredAtFinish = lifecycle === 'finished' && attention !== 'none';
  if (isUnansweredAtFinish) return ATTENTION_TEXT.no_answer;
  return ATTENTION_TEXT[attention] ?? attention;
}

export function describeElapsed(incident: Incident, now: number): string {
  const end = incident.lifecycle === 'finished' ? Date.parse(incident.lastActivityAt) : now;
  return formatDuration(end - Date.parse(incident.startedAt));
}

function describeSpareTime(incident: Incident): string {
  const spare = Date.parse(incident.deadlineAt) - Date.parse(incident.lastActivityAt);
  if (Number.isNaN(spare) || spare <= 0) return 'Finished at the time limit';
  const minutes = Math.floor(spare / MINUTE_MS);
  return minutes < 1 ? 'Finished with under 1 min to spare' : `Finished with ${minutes} min to spare`;
}

export function describeBudgetLeft(incident: Incident, now: number): string {
  if (incident.lifecycle === 'finished') return describeSpareTime(incident);
  const left = Date.parse(incident.deadlineAt) - now;
  return left > 0 ? formatDuration(left) : 'Budget used';
}
