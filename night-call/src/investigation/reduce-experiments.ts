import type { IncidentEvent } from './event-types';
import { payloadOf } from './payload-schemas';
import { plainPayload } from './plain-payload';
import type { Experiment, Reproduction } from './proof-snapshot';
import { reducerFrom } from './reducer';
import type { Snapshot } from './snapshot';

type ExperimentChange = { experimentId: string; change: (experiment: Experiment) => Partial<Experiment> };

const reproductionByVerdict: Partial<Record<string, Reproduction>> = {
  matches: 'confirmed',
  differs: 'not_reproduced',
  inconclusive: 'inconclusive',
};

function changeExperiment(snapshot: Snapshot, update: ExperimentChange): Snapshot {
  const experiments = snapshot.experiments.map((experiment) =>
    experiment.id === update.experimentId ? { ...experiment, ...update.change(experiment) } : experiment,
  );
  return { ...snapshot, experiments };
}

function recordContract(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { contractId, checks } = payloadOf(event, 'contract_recorded');
  return { ...snapshot, contract: { id: contractId, checks } };
}

function startExperiment(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { experimentId, trafficSource, ...started } = plainPayload(payloadOf(event, 'experiment_started'));
  const empty = { finishedAt: null, progress: null, verdict: null, checks: [], review: null, seriesRef: null };
  const source = { trafficSource: trafficSource ?? null };
  const experiment: Experiment = { id: experimentId, ...started, ...source, startedAt: event.occurredAt, ...empty };
  const others = snapshot.experiments.filter((existing) => existing.id !== experimentId);
  const reproduction = started.kind === 'reproduction' ? 'testing' : snapshot.reproduction;
  return { ...snapshot, experiments: [...others, experiment], reproduction };
}

function recordProgress(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { experimentId, ...progress } = plainPayload(payloadOf(event, 'experiment_progress'));
  return changeExperiment(snapshot, { experimentId, change: () => ({ progress }) });
}

function finishExperiment(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { experimentId, verdict, checks, seriesRef } = payloadOf(event, 'experiment_finished');
  const change = () => ({ finishedAt: event.occurredAt, verdict, checks, seriesRef });
  return changeExperiment(snapshot, { experimentId, change });
}

function reproductionAfterReview(experiment: Experiment | undefined, accepted: boolean): Reproduction | null {
  if (experiment?.kind !== 'reproduction') return null;
  if (!accepted) return 'testing';
  return reproductionByVerdict[experiment.verdict ?? ''] ?? 'testing';
}

function reviewExperiment(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { experimentId, accepted, reasons } = payloadOf(event, 'experiment_reviewed');
  const reviewed = snapshot.experiments.find((experiment) => experiment.id === experimentId);
  const review = { accepted, reasons, reviewedAt: event.occurredAt };
  const changed = changeExperiment(snapshot, { experimentId, change: () => ({ review }) });
  return { ...changed, reproduction: reproductionAfterReview(reviewed, accepted) ?? snapshot.reproduction };
}

export const reduceExperiments = reducerFrom({
  contract_recorded: recordContract,
  experiment_started: startExperiment,
  experiment_progress: recordProgress,
  experiment_finished: finishExperiment,
  experiment_reviewed: reviewExperiment,
});
