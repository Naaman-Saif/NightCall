import type { Experiment, Hypothesis, Snapshot } from '../api/contract';
import type { Claim } from '../kit';

export type ClaimView = { claim: Claim; qualifier: string };

const IN_SANDBOX = 'in the sandbox, under the recorded conditions';

const HYPOTHESIS_STATUS_TEXT: Record<Hypothesis['status'], string> = {
  proposed: 'proposed, not tested yet',
  testing: 'being tested',
  supported: 'supported by the evidence',
  contradicted: 'contradicted by the evidence',
  inconclusive: 'inconclusive',
  superseded: 'superseded',
};

function isAcceptedReproductionOf(experiment: Experiment, hypothesis: Hypothesis): boolean {
  const isMatchingReproduction = experiment.kind === 'reproduction' && experiment.verdict === 'matches';
  return isMatchingReproduction && experiment.hypothesisId === hypothesis.id && experiment.review?.accepted === true;
}

export function hypothesisClaim(snapshot: Snapshot, hypothesis: Hypothesis): ClaimView {
  const reason = hypothesis.reason ? `. ${hypothesis.reason}` : '';
  const qualifier = `${HYPOTHESIS_STATUS_TEXT[hypothesis.status]}${reason}`;
  const experiments = snapshot.experiments.filter((experiment) => isAcceptedReproductionOf(experiment, hypothesis));
  if (snapshot.reproduction === 'confirmed' && experiments.length > 0) return { claim: 'reproduced', qualifier: IN_SANDBOX };
  if (hypothesis.status === 'inconclusive') return { claim: 'inconclusive', qualifier };
  return { claim: 'hypothesis', qualifier };
}

function reviewText(experiment: Experiment): string {
  if (!experiment.review) return 'waiting for review';
  return experiment.review.accepted ? 'accepted in review' : 'rejected in review';
}

export function experimentClaim(experiment: Experiment): ClaimView | null {
  if (!experiment.verdict) return null;
  if (experiment.verdict === 'failed') return { claim: 'failing', qualifier: 'the experiment did not run to completion' };
  if (experiment.verdict === 'inconclusive') return { claim: 'inconclusive', qualifier: reviewText(experiment) };
  if (experiment.verdict === 'differs') return { claim: 'observed', qualifier: `differs from production, ${reviewText(experiment)}` };
  const isAcceptedReproduction = experiment.kind === 'reproduction' && experiment.review?.accepted === true;
  if (isAcceptedReproduction) return { claim: 'reproduced', qualifier: IN_SANDBOX };
  return { claim: 'observed', qualifier: `matches production, ${reviewText(experiment)}` };
}
