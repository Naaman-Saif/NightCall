import type { Experiment, IncidentEvent, Reproduction, Snapshot, Verdict } from '../api/contract';
import { reducerFrom } from './reducer-table';

type ExperimentChange = Partial<Experiment> & { id: string };

const REPRODUCTION_AFTER_ACCEPTED_VERDICT: Record<Verdict, Reproduction> = {
  matches: 'confirmed',
  differs: 'not_reproduced',
  inconclusive: 'inconclusive',
  failed: 'testing',
};

function recordContract(snapshot: Snapshot, event: IncidentEvent<'contract_recorded'>): Snapshot {
  return { ...snapshot, contract: { id: event.payload.contractId, checks: event.payload.checks } };
}

function startExperiment(snapshot: Snapshot, event: IncidentEvent<'experiment_started'>): Snapshot {
  const { experimentId, kind, hypothesisId, contractId, purpose, recipe } = event.payload;
  const experiment: Experiment = {
    id: experimentId, kind, hypothesisId, contractId, purpose, recipe,
    startedAt: event.occurredAt, finishedAt: null, progress: null, verdict: null, checks: [], review: null, seriesRef: null,
  };
  const reproduction = kind === 'reproduction' ? 'testing' : snapshot.reproduction;
  return { ...snapshot, experiments: [...snapshot.experiments, experiment], reproduction };
}

function changeExperiment(snapshot: Snapshot, change: ExperimentChange): Snapshot {
  const experiments = snapshot.experiments.map((experiment) =>
    experiment.id === change.id ? { ...experiment, ...change } : experiment,
  );
  return { ...snapshot, experiments };
}

function recordProgress(snapshot: Snapshot, event: IncidentEvent<'experiment_progress'>): Snapshot {
  const { experimentId, requests, errors, peakMemoryBytes, peakCpuPercent } = event.payload;
  return changeExperiment(snapshot, { id: experimentId, progress: { requests, errors, peakMemoryBytes, peakCpuPercent } });
}

function finishExperiment(snapshot: Snapshot, event: IncidentEvent<'experiment_finished'>): Snapshot {
  const { experimentId, verdict, checks, seriesRef } = event.payload;
  return changeExperiment(snapshot, { id: experimentId, verdict, checks, seriesRef, finishedAt: event.occurredAt });
}

function reproductionAfterReview(experiment: Experiment): Reproduction {
  if (!experiment.review?.accepted || !experiment.verdict) return 'testing';
  return REPRODUCTION_AFTER_ACCEPTED_VERDICT[experiment.verdict];
}

function reviewExperiment(snapshot: Snapshot, event: IncidentEvent<'experiment_reviewed'>): Snapshot {
  const { experimentId, accepted, reasons } = event.payload;
  const reviewed = changeExperiment(snapshot, { id: experimentId, review: { accepted, reasons } });
  const experiment = reviewed.experiments.find((known) => known.id === experimentId);
  if (experiment?.kind !== 'reproduction') return reviewed;
  return { ...reviewed, reproduction: reproductionAfterReview(experiment) };
}

export const reduceExperiments = reducerFrom({
  contract_recorded: recordContract,
  experiment_started: startExperiment,
  experiment_progress: recordProgress,
  experiment_finished: finishExperiment,
  experiment_reviewed: reviewExperiment,
});
