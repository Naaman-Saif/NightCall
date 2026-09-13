import { claimsFailingRequests, failuresMeasured } from './brief-check.js';
import { settleCitations, type DroppedCitation } from './citation-rules.js';
import { settleIntervals, unmatchedNumbers } from './claim-numbers.js';
import { effectFailure, supportFailure, type CheckFailure } from './claim-support.js';
import { unknownEvidenceIds, type EvidenceLedger, type RecordedReading } from './evidence-ledger.js';
import type { ReaderName } from './incident-api.js';
import { wordingProblem } from './plain-words.js';

export type Cause = { claim: string; supportingEvidenceIds: string[]; contradictingEvidenceIds: string[]; contradicts?: Record<string, string>; confirmWith: string };
export type CheckedCause = Cause & { hypothesisId: string };
export type DroppedCause = CheckFailure & { claim: string; supportingEvidenceIds: string[] };
export type RephrasedCause = { claim: string; removed: string[] };
export type ClaimUnderCheck = { cause: Cause; checkedText: string };
export type { CheckFailure };

export const MAX_CAUSES = 3;
export const CLAIM_LIMIT = 160;
export const CONFIRM_LIMIT = 200;

function citedIds(cause: Cause): string[] {
  return [...cause.supportingEvidenceIds, ...cause.contradictingEvidenceIds];
}

function distinct(ids: string[]): string[] {
  return [...new Set(ids)];
}

function tidied(cause: Cause): Cause {
  return { ...cause, supportingEvidenceIds: distinct(cause.supportingEvidenceIds), contradictingEvidenceIds: distinct(cause.contradictingEvidenceIds) };
}

function citedReadings(cause: Cause, ledger: EvidenceLedger): RecordedReading[] {
  return citedIds(cause).map((id) => ledger.readings.get(id)).filter((reading): reading is RecordedReading => reading !== undefined);
}

function evidenceFailure(cause: Cause, ledger: EvidenceLedger): CheckFailure | null {
  const unknown = unknownEvidenceIds(ledger, citedIds(cause));
  if (unknown.length > 0) return { check: 'evidence_not_found', value: unknown.join(', ') };
  return cause.supportingEvidenceIds.length === 0 ? { check: 'no_supporting_evidence', value: 'none cited' } : null;
}

function shapeFailure(cause: Cause): CheckFailure | null {
  if (cause.claim.length > CLAIM_LIMIT) return { check: 'claim_too_long', value: `${cause.claim.length} characters` };
  if (cause.confirmWith.length > CONFIRM_LIMIT) return { check: 'confirm_step_too_long', value: `${cause.confirmWith.length} characters` };
  const both = cause.supportingEvidenceIds.filter((id) => cause.contradictingEvidenceIds.includes(id));
  return both.length > 0 ? { check: 'cited_as_supporting_and_contradicting', value: distinct(both).join(', ') } : null;
}

function contentFailure(claim: ClaimUnderCheck, ledger: EvidenceLedger): CheckFailure | null {
  const texts = citedReadings(claim.cause, ledger).map((reading) => `${reading.summary}\n${reading.excerpt}`);
  const numbers = unmatchedNumbers(claim.checkedText, texts);
  if (numbers.length > 0) return { check: 'number_not_in_cited_readings', value: numbers.join(', ') };
  if (claimsFailingRequests(claim.cause.claim) && !failuresMeasured(ledger.impact)) return { check: 'failing_requests_against_zero_rate', value: claim.cause.claim.slice(0, 120) };
  const wording = wordingProblem([claim.cause.claim, claim.cause.confirmWith]);
  return wording ? { check: 'wording', value: wording } : effectFailure(claim.cause.claim);
}

export function causeFailure(claim: ClaimUnderCheck, ledger: EvidenceLedger): CheckFailure | null {
  return evidenceFailure(claim.cause, ledger) ?? shapeFailure(claim.cause) ?? supportFailure(claim.cause, ledger) ?? contentFailure(claim, ledger);
}

function settledCause(cause: Cause, ledger: EvidenceLedger): ClaimUnderCheck & { removed: string[] } {
  const settled = settleIntervals(cause.claim, citedReadings(cause, ledger));
  return { cause: { ...cause, claim: settled.claim }, checkedText: settled.checkedText, removed: settled.rephrased };
}

export function checkCauses(causes: Cause[], ledger: EvidenceLedger) {
  const result = { accepted: [] as CheckedCause[], dropped: [] as DroppedCause[], rephrased: [] as RephrasedCause[], droppedCitations: [] as DroppedCitation[] };
  for (const proposed of causes.slice(0, MAX_CAUSES).map(tidied)) {
    const cited = settleCitations(proposed, ledger);
    result.droppedCitations.push(...cited.dropped);
    const settled = settledCause(cited.cause, ledger);
    if (settled.removed.length > 0) result.rephrased.push({ claim: settled.cause.claim, removed: settled.removed });
    const failure = causeFailure(settled, ledger);
    if (failure) result.dropped.push({ claim: settled.cause.claim, supportingEvidenceIds: settled.cause.supportingEvidenceIds, ...failure });
    else result.accepted.push({ ...settled.cause, hypothesisId: `h-${result.accepted.length + 1}` });
  }
  return result;
}

export function independentReaders(cause: Cause, ledger: EvidenceLedger): ReaderName[] {
  const readers = cause.supportingEvidenceIds.map((id) => ledger.readings.get(id)?.reader);
  return [...new Set(readers.filter((reader): reader is ReaderName => reader !== undefined))];
}

export function mostLikelyCause(causes: CheckedCause[], ledger: EvidenceLedger): CheckedCause | null {
  const ranked = causes
    .filter((cause) => cause.contradictingEvidenceIds.length === 0)
    .map((cause) => ({ cause, support: independentReaders(cause, ledger).length }))
    .filter((candidate) => candidate.support >= 2)
    .sort((first, second) => second.support - first.support);
  if (ranked.length === 0 || ranked[1]?.support === ranked[0].support) return null;
  return ranked[0].cause;
}
