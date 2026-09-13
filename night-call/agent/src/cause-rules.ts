import { claimsFailingRequests, failuresMeasured } from './brief-check.js';
import { readingText, unknownEvidenceIds, type EvidenceLedger } from './evidence-ledger.js';
import type { ReaderName } from './incident-api.js';
import { wordingProblem } from './plain-words.js';

export type Cause = { claim: string; supportingEvidenceIds: string[]; contradictingEvidenceIds: string[]; confirmWith: string };
export type CheckedCause = Cause & { hypothesisId: string };
export type DroppedCause = { claim: string; problem: string };

export const MAX_CAUSES = 3;
const NUMBER = /\d+(?:\.\d+)?/g;

function citedIds(cause: Cause): string[] {
  return [...cause.supportingEvidenceIds, ...cause.contradictingEvidenceIds];
}

function unsupportedNumbers(cause: Cause, ledger: EvidenceLedger): string[] {
  const cited = citedIds(cause).map((id) => readingText(ledger, id)).join('\n');
  const available = new Set(cited.match(NUMBER) ?? []);
  return (cause.claim.match(NUMBER) ?? []).filter((number) => !available.has(number));
}

export function causeProblem(cause: Cause, ledger: EvidenceLedger): string | null {
  const unknown = unknownEvidenceIds(ledger, citedIds(cause));
  if (unknown.length > 0) return `cites evidence that does not exist: ${unknown.join(', ')}`;
  if (cause.supportingEvidenceIds.length === 0) return 'cites no supporting evidence';
  const numbers = unsupportedNumbers(cause, ledger);
  if (numbers.length > 0) return `quotes numbers that no cited reading contains: ${numbers.join(', ')}`;
  if (claimsFailingRequests(cause.claim) && !failuresMeasured(ledger.impact)) return 'claims failing requests but the failure-rate reading shows none';
  return wordingProblem([cause.claim, cause.confirmWith]);
}

export function checkCauses(causes: Cause[], ledger: EvidenceLedger): { accepted: CheckedCause[]; dropped: DroppedCause[] } {
  const accepted: CheckedCause[] = [];
  const dropped: DroppedCause[] = [];
  for (const cause of causes.slice(0, MAX_CAUSES)) {
    const problem = causeProblem(cause, ledger);
    if (problem) dropped.push({ claim: cause.claim, problem });
    else accepted.push({ ...cause, hypothesisId: `h-${accepted.length + 1}` });
  }
  return { accepted, dropped };
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
