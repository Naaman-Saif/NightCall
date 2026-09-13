import type { Cause } from './cause-rules.js';
import { MECHANISM_WORDS, readingContradicts, type CheckFailure } from './claim-support.js';
import type { EvidenceLedger, RecordedReading } from './evidence-ledger.js';

export const CONTRADICTS_LIMIT = 160;

export type DroppedCitation = CheckFailure & { claim: string; evidenceId: string; citedAs: 'supporting' | 'contradicting' };
type Citation = { evidenceId: string; reading: RecordedReading };
type CitationProblem = (citation: Citation) => CheckFailure | null;

const COUNT_ONLY_SUMMARY = /^(\d+ log lines from|0 error spans in 0 traces)\b/i;
const CONNECTIVES = /^(because|due to|caused by)$/i;
const EFFECT_READERS = new Set(['failure-rate', 'oom-events']);

function mechanismStems(claim: string): string[] {
  const words = [...claim.matchAll(MECHANISM_WORDS)].map((match) => match[0]).filter((word) => !CONNECTIVES.test(word));
  return [...new Set(words.map((word) => word.toLowerCase().slice(0, 4)))];
}

export function namesMechanism(sentence: string, claim: string): boolean {
  const said = sentence.toLowerCase();
  return mechanismStems(claim).some((stem) => said.includes(stem));
}

function isNeutral(reading: RecordedReading, claim: string): boolean {
  return COUNT_ONLY_SUMMARY.test(reading.summary) && !namesMechanism(reading.excerpt, claim);
}

function neutralProblem(cause: Cause, reading: RecordedReading): CheckFailure | null {
  return isNeutral(reading, cause.claim) ? { check: 'neutral_reading_cited', value: reading.summary.slice(0, 120) } : null;
}

function againstProblem(cause: Cause, citation: Citation): CheckFailure | null {
  const neutral = neutralProblem(cause, citation.reading);
  if (neutral) return neutral;
  if (EFFECT_READERS.has(citation.reading.reader) && !readingContradicts(cause.claim, citation.reading)) {
    return { check: 'effect_fits_cause', value: citation.reading.summary.slice(0, 120) };
  }
  const sentence = cause.contradicts?.[citation.evidenceId]?.trim() ?? '';
  if (sentence === '') return { check: 'contradiction_not_named', value: 'no contradicts sentence' };
  if (sentence.length > CONTRADICTS_LIMIT) return { check: 'contradiction_too_long', value: `${sentence.length} characters` };
  return namesMechanism(sentence, cause.claim) ? null : { check: 'contradiction_not_in_mechanism', value: sentence.slice(0, 120) };
}

function keptCitations(cause: Cause, plan: { ledger: EvidenceLedger; citedAs: DroppedCitation['citedAs']; problemOf: CitationProblem; dropped: DroppedCitation[] }): string[] {
  const ids = plan.citedAs === 'supporting' ? cause.supportingEvidenceIds : cause.contradictingEvidenceIds;
  return ids.filter((evidenceId) => {
    const reading = plan.ledger.readings.get(evidenceId);
    const citedBothWays = cause.supportingEvidenceIds.includes(evidenceId) && cause.contradictingEvidenceIds.includes(evidenceId);
    const problem = reading && !citedBothWays ? plan.problemOf({ evidenceId, reading }) : null;
    if (problem) plan.dropped.push({ claim: cause.claim, evidenceId, citedAs: plan.citedAs, ...problem });
    return problem === null;
  });
}

export function settleCitations(cause: Cause, ledger: EvidenceLedger): { cause: Cause; dropped: DroppedCitation[] } {
  const dropped: DroppedCitation[] = [];
  const supportingEvidenceIds = keptCitations(cause, { ledger, citedAs: 'supporting', problemOf: (citation) => neutralProblem(cause, citation.reading), dropped });
  const contradictingEvidenceIds = keptCitations(cause, { ledger, citedAs: 'contradicting', problemOf: (citation) => againstProblem(cause, citation), dropped });
  return { cause: { ...cause, supportingEvidenceIds, contradictingEvidenceIds }, dropped };
}
