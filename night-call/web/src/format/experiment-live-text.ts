import type { Experiment, Publication, Snapshot, TrafficSource, Verdict } from '../api/contract';
import { bytesToMib } from './series-points';

const VERDICT_TEXT: Record<Verdict, string> = {
  matches: 'Finished: the checks matched production',
  differs: 'Finished: a primary check did not match production',
  inconclusive: 'Finished: inconclusive, a reading was missing',
  failed: 'The experiment could not run to completion',
};

export function latestExperimentOf(snapshot: Snapshot, kind: Experiment['kind']): Experiment | null {
  return snapshot.experiments.filter((experiment) => experiment.kind === kind).at(-1) ?? null;
}

export function describeExperimentState(experiment: Experiment): string {
  if (experiment.verdict) return VERDICT_TEXT[experiment.verdict] ?? experiment.verdict;
  if (!experiment.progress) return 'Running: starting the test copy';
  const memory = bytesToMib(experiment.progress.peakMemoryBytes);
  return `Running: ${experiment.progress.requests} requests sent, peak memory ${memory} MiB`;
}

const TRAFFIC_SOURCE_TEXT: Record<TrafficSource, string> = {
  traces: "Replayed the incident's real traffic",
  prometheus_rate_fallback: "Replayed the incident's request rate (request details missing)",
  fixed_fallback: 'Fixed test load (real traffic missing)',
};

export function describeTrafficSource(experiment: Experiment): string {
  if (!experiment.trafficSource) return 'Traffic source not recorded';
  return TRAFFIC_SOURCE_TEXT[experiment.trafficSource] ?? 'Traffic source not recorded';
}

export function describePublication(publication: Publication): string | null {
  if (publication.state === 'publishing') return 'Opening the pull request';
  if (publication.state === 'failed') {
    return `The pull request could not be opened: ${publication.failureReason ?? 'no reason was recorded'}`;
  }
  if (publication.state !== 'published') return null;
  return publication.number === null ? 'Pull request opened' : `Pull request #${publication.number} opened`;
}
