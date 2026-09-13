import type { Experiment } from '../investigation/proof-snapshot';
import type { Snapshot } from '../investigation/snapshot';

export function acceptedReproduction(snapshot: Snapshot): Experiment | null {
  const accepted = snapshot.experiments.filter(
    (experiment) => experiment.kind === 'reproduction' && experiment.verdict === 'matches' && experiment.review?.accepted === true,
  );
  return accepted.at(-1) ?? null;
}
