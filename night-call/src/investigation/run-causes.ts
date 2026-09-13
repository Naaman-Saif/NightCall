import type { CauseEvidence, RunCause } from './run-report-types';
import type { Hypothesis, Snapshot } from './snapshot';

const CAUSE_STATUS: Partial<Record<Hypothesis['status'], RunCause['status']>> = {
  proposed: 'proposed',
  testing: 'proposed',
  inconclusive: 'proposed',
  supported: 'supported',
  contradicted: 'contradicted',
};

function citedEvidence(snapshot: Snapshot, evidenceIds: string[]): CauseEvidence[] {
  return [...new Set(evidenceIds)].map((evidenceId) => {
    const recorded = Object.hasOwn(snapshot.evidence, evidenceId);
    return { text: recorded ? snapshot.evidence[evidenceId].summary : 'Cited evidence was not recorded', evidenceId };
  });
}

function causeOf(snapshot: Snapshot, hypothesis: Hypothesis): RunCause[] {
  const status = CAUSE_STATUS[hypothesis.status];
  if (!status) return [];
  const supporting = citedEvidence(snapshot, hypothesis.supportingEvidenceIds);
  const contradicting = citedEvidence(snapshot, hypothesis.contradictingEvidenceIds);
  return [{ id: hypothesis.id, claim: hypothesis.claim, status, supporting, contradicting, confirmBy: hypothesis.predicted }];
}

export function causesOf(snapshot: Snapshot): RunCause[] {
  return snapshot.hypotheses.flatMap((hypothesis) => causeOf(snapshot, hypothesis));
}

export function hasRecordedContradiction(snapshot: Snapshot, hypothesisId: unknown): boolean {
  const hypothesis = snapshot.hypotheses.find((item) => item.id === hypothesisId);
  return hypothesis?.contradictingEvidenceIds.some((evidenceId) => Object.hasOwn(snapshot.evidence, evidenceId)) ?? false;
}
