import type { Experiment, Snapshot, TrafficSource, Verdict } from '../api/contract';
import { bytesToMib } from './series-points';
import { describeTraffic } from './traffic-text';

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

export function describeTrafficSource(experiment: Experiment): string {
  const traffic = describeTraffic({ trafficSource: experiment.trafficSource, speed: experiment.recipe.speed });
  return traffic ?? 'Traffic source not recorded';
}

export function latestTrafficSourceOf(snapshot: Snapshot): TrafficSource | null {
  return snapshot.experiments.map((experiment) => experiment.trafficSource ?? null).filter(Boolean).at(-1) ?? null;
}

function isTestIncidentWithoutPullRequest(snapshot: Snapshot): boolean {
  const isDone = snapshot.mitigation?.status === 'verified' || snapshot.incident.lifecycle === 'finished';
  return snapshot.incident.illustrative && snapshot.publication.state === 'not_eligible' && isDone;
}

export function describePublication(snapshot: Snapshot): string | null {
  const { publication } = snapshot;
  if (isTestIncidentWithoutPullRequest(snapshot)) return 'Test incident: no pull request';
  if (publication.state === 'publishing') return 'Opening the pull request';
  if (publication.state === 'failed') {
    return `The pull request could not be opened: ${publication.failureReason ?? 'no reason was recorded'}`;
  }
  if (publication.state !== 'published') return null;
  return publication.number === null ? 'Pull request opened' : `Pull request #${publication.number} opened`;
}
