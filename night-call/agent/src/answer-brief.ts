import type { CheckedCause } from './cause-rules.js';
import { readingFacts, type Brief, type EvidenceLedger } from './evidence-ledger.js';
import { capitalized, crashStatement, failureStatement } from './impact-facts.js';
import type { Answer, IncidentApi } from './incident-api.js';
import type { ProgressEvent } from './progress.js';
import { causesLine, NOT_REPRODUCED, withoutEndMark } from './report-lines.js';
import { pathSentence, UNCONFIRMED_IMPACT, type UrgencyDecision } from './urgency.js';
import { cleanBrief } from './write-tools.js';

export type ReportFacts = { answer: Answer | null; decision: UrgencyDecision; causes: CheckedCause[]; mostLikely: CheckedCause | null };

export const EVIDENCE_BRIEF_SUMMARY = 'Summary from the evidence readings; analysis still running.';

export function evidenceBrief(ledger: EvidenceLedger): ProgressEvent {
  const nextStep = 'Compare possible causes and wait for the answer about customer impact.';
  const brief = cleanBrief({ summary: EVIDENCE_BRIEF_SUMMARY, knownFacts: readingFacts(ledger), unknowns: ['What is behind the failures'], nextStep });
  return { type: 'brief_updated', summary: brief.summary, payload: brief };
}

function whatHappened(ledger: EvidenceLedger): string {
  const impact = ledger.impact;
  const statements = [failureStatement(impact?.failure ?? null), ...(impact?.crashes ? [crashStatement(impact.crashes)] : [])];
  return `${capitalized(statements.join(', and '))}.`;
}

function causeUnknown(cause: CheckedCause, mostLikely: CheckedCause | null): string {
  const label = cause === mostLikely ? 'Most likely possible cause' : 'Possible cause';
  const against = cause.contradictingEvidenceIds.length > 0 ? `; contradicted by ${cause.contradictingEvidenceIds.join(', ')}` : '';
  const evidence = `Supported by ${cause.supportingEvidenceIds.join(', ')}${against}.`;
  return `${label}: ${withoutEndMark(cause.claim)}. ${evidence} Would be confirmed by: ${withoutEndMark(cause.confirmWith)}.`;
}

export function causeBriefOf(ledger: EvidenceLedger, facts: ReportFacts): Brief {
  const answer = facts.answer ? `Answer about customer impact: "${facts.answer.text}".` : 'No answer about customer impact arrived.';
  const causes = causesLine({ count: facts.causes.length, mostLikely: facts.mostLikely?.claim ?? null });
  const summary = [whatHappened(ledger), answer, causes, NOT_REPRODUCED].join(' ');
  const unconfirmed = facts.decision.impactConfirmed ? [] : [UNCONFIRMED_IMPACT];
  const unknowns = [...unconfirmed, ...facts.causes.map((cause) => causeUnknown(cause, facts.mostLikely))];
  return { summary, knownFacts: readingFacts(ledger), unknowns, nextStep: pathSentence(facts.decision) };
}

export async function postCauseBrief(context: { api: IncidentApi; ledger: EvidenceLedger }, facts: ReportFacts): Promise<void> {
  const brief = cleanBrief(causeBriefOf(context.ledger, facts));
  await context.api.postEvent({ type: 'brief_updated', summary: brief.summary.slice(0, 2000), payload: brief });
  context.ledger.lastBrief = brief;
}
