import { type Brief, failureShareOf, readingFacts, type EvidenceLedger } from './evidence-ledger.js';
import type { Answer, IncidentApi } from './incident-api.js';
import type { Lead } from './lead-steps.js';
import { logProgress } from './progress.js';
import { failuresPer100, pathSentence, UNCONFIRMED_IMPACT, type UrgencyDecision } from './urgency.js';
import { briefProblem, cleanBrief } from './write-tools.js';

export type BriefParts = { api: IncidentApi; ledger: EvidenceLedger; lead: Lead };
export type Outcome = { answer: Answer | null; decision: UrgencyDecision };

export function withDecision(brief: Brief, decision: UrgencyDecision): Brief {
  const listed = brief.unknowns.includes(UNCONFIRMED_IMPACT);
  const unknowns = decision.impactConfirmed || listed ? brief.unknowns : [UNCONFIRMED_IMPACT, ...brief.unknowns];
  return { ...brief, unknowns };
}

function answerLine(outcome: Outcome): string {
  return outcome.answer ? `Answer about customer impact: "${outcome.answer.text}".` : 'No answer about customer impact arrived in time.';
}

export function fallbackBrief(ledger: EvidenceLedger, outcome: Outcome): Brief {
  const earlier = ledger.lastBrief;
  const opening = earlier?.summary ?? `Recommendations are failing on about ${failuresPer100(failureShareOf(ledger))} in 100 requests.`;
  const summary = `${opening} ${answerLine(outcome)}`;
  return { summary, knownFacts: earlier?.knownFacts ?? readingFacts(ledger), unknowns: earlier?.unknowns ?? [], nextStep: pathSentence(outcome.decision) };
}

async function draftedBrief(parts: BriefParts, outcome: Outcome): Promise<Brief | null> {
  try {
    const request = { ...outcome, lastBrief: parts.ledger.lastBrief, evidenceIds: [...parts.ledger.ids] };
    const draft = await parts.lead.draftBrief(request);
    const nextStep = `${pathSentence(outcome.decision)} ${draft.nextDetail}`;
    return { summary: draft.summary, knownFacts: draft.knownFacts, unknowns: draft.unknowns, nextStep };
  } catch (error) {
    logProgress({ draftBriefFailed: String(error).slice(0, 300) });
    return null;
  }
}

export async function postAnswerBrief(parts: BriefParts, outcome: Outcome): Promise<Brief> {
  const drafted = await draftedBrief(parts, outcome);
  const problem = drafted ? briefProblem(parts.ledger, withDecision(drafted, outcome.decision)) : 'no draft';
  if (problem) logProgress({ answerBriefFallback: problem });
  const chosen = withDecision(problem || !drafted ? fallbackBrief(parts.ledger, outcome) : drafted, outcome.decision);
  const brief = cleanBrief(chosen);
  await parts.api.postEvent({ type: 'brief_updated', summary: brief.summary.slice(0, 2000), payload: brief });
  parts.ledger.lastBrief = brief;
  return brief;
}
