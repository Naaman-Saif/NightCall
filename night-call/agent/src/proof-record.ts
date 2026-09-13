import type { CheckResult, PublicationFacts, Verdict } from './proof-types.js';
import { isTestIncident } from './publication-wait.js';

export type ExperimentRecord = {
  experimentId: string;
  hypothesisId: string;
  verdict: Verdict | null;
  checks: CheckResult[];
  recipeSource: string;
  accepted: boolean;
};

export type VerificationRecord = { verificationRunId: string; verdict: Verdict | null; approved: boolean };

export type ProofRecord = {
  contractId: string | null;
  experiments: ExperimentRecord[];
  mitigationId: string | null;
  verification: VerificationRecord | null;
  publication: PublicationFacts | null;
};

const VERDICT_WORDS: Record<Verdict, string> = {
  matches: 'matched the recorded checks, but the review did not accept it',
  differs: 'did not match the recorded checks',
  inconclusive: 'had a missing observation',
  failed: 'could not run in the test copy',
};

const SOURCE_SENTENCES: Record<string, string> = {
  prometheus_rate_fallback: "The test copy used traffic rebuilt from the incident's request rate, not captured traces.",
  fixed_fallback: "The incident's traffic recipe was missing, so the test copy used fixed fallback traffic.",
};

export function newProofRecord(): ProofRecord {
  return { contractId: null, experiments: [], mitigationId: null, verification: null, publication: null };
}

export function acceptedReproductions(record: ProofRecord): ExperimentRecord[] {
  return record.experiments.filter((experiment) => experiment.accepted && experiment.verdict === 'matches');
}

export function causeReproduced(record: ProofRecord, hypothesisId: string): boolean {
  return acceptedReproductions(record).some((experiment) => experiment.hypothesisId === hypothesisId);
}

function reproductionSentence(record: ProofRecord): string {
  if (acceptedReproductions(record).length > 0) return 'Reproduced in a test copy: the failure matched every recorded check and the review accepted it.';
  const last = record.experiments.at(-1);
  if (!last) return 'Not yet reproduced in a test copy.';
  return `Not reproduced in a test copy: the experiment ${last.verdict ? VERDICT_WORDS[last.verdict] : 'reported no verdict'}.`;
}

function sourceSentences(record: ProofRecord): string[] {
  const sources = new Set(record.experiments.map((experiment) => experiment.recipeSource));
  return [...sources].map((source) => SOURCE_SENTENCES[source] ?? '');
}

function mitigationSentence(record: ProofRecord): string {
  return record.mitigationId ? 'Proposed mitigation: set the recommendationCacheFailure flag to off and restart the service.' : '';
}

function verificationSentence(record: ProofRecord): string {
  const run = record.verification;
  if (!run) return record.mitigationId ? 'The mitigation was not verified.' : '';
  if (run.approved) return 'Verified: the verification run passed every recorded check and its review was accepted.';
  return 'Not verified: the verification run did not pass every recorded check.';
}

function publicationSentence(record: ProofRecord): string {
  const publication = record.publication;
  if (publication?.state === 'published' && publication.url) return `Pull request opened for review: ${publication.url}.`;
  if (isTestIncident(publication)) return 'Test incident: no pull request was opened.';
  return publication?.state === 'failed' ? 'Opening the pull request failed.' : '';
}

export function proofSentences(record: ProofRecord): string[] {
  const sentences = [reproductionSentence(record), ...sourceSentences(record), mitigationSentence(record), verificationSentence(record), publicationSentence(record)];
  return sentences.filter(Boolean);
}

export function outcomeSentence(record: ProofRecord): string {
  if (record.publication?.state === 'published') return 'The verified mitigation waits in a pull request for a person to review and merge.';
  if (record.verification?.approved && isTestIncident(record.publication)) return 'The mitigation is verified; this is a test incident, so no pull request was opened.';
  if (record.verification?.approved) return 'The mitigation is verified; no pull request is open yet.';
  if (acceptedReproductions(record).length > 0) return 'The failure was reproduced, but no mitigation was verified in this run.';
  return 'Nothing was reproduced or verified in this run.';
}
