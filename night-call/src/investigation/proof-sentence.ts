import type { Experiment } from './proof-snapshot';
import type { Snapshot } from './snapshot';
import { speedWords, trafficWords } from './traffic-words';

export function acceptedReproductionOf(snapshot: Snapshot): Experiment | null {
  const accepted = snapshot.experiments.filter((item) => item.kind === 'reproduction' && item.verdict === 'matches' && item.review?.accepted === true);
  return accepted.at(-1) ?? null;
}

export function reproductionSentence(snapshot: Snapshot, experiment: Experiment): string {
  const claim = snapshot.hypotheses.find((hypothesis) => hypothesis.id === experiment.hypothesisId)?.claim.trim().replace(/[.\s]+$/, '');
  const cause = claim ? `: ${claim}` : '';
  return `Reproduced in a test copy with ${trafficWords(experiment.trafficSource)}${cause}.`;
}

function verificationSentence(snapshot: Snapshot): string | null {
  if (snapshot.mitigation?.status !== 'verified') return null;
  return `Fix verified 3 of 3${speedWords(snapshot.cycles[0]?.speed)}.`;
}

function publicationSentence(snapshot: Snapshot): string | null {
  const { state, number } = snapshot.publication;
  if (state === 'published') return `PR #${number} opened.`;
  if (state === 'failed') return 'The pull request failed to open.';
  if (state === 'not_eligible' && snapshot.publication.repository !== null) return 'Test incident: no pull request.';
  return null;
}

export function proofSentences(snapshot: Snapshot): string[] {
  const budget = snapshot.incident.completionReason === 'budget_exhausted' ? ['The time budget ran out before a verified fix was published.'] : [];
  return [verificationSentence(snapshot), publicationSentence(snapshot), ...budget].filter((sentence): sentence is string => sentence !== null);
}
