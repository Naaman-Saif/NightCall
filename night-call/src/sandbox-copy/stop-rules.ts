import type { Observation } from './observation';
import type { RequestResult } from './recommendations-request';

export interface WorkloadSample {
  at: string;
  index: number;
  traceId: string;
  response: RequestResult;
  observation: Observation;
  requestMs: number;
}

export interface StopCheck {
  sample: WorkloadSample;
  before: Observation;
}

export function sampleShowsFailure(check: StopCheck): boolean {
  const { sample, before } = check;
  const restarted = sample.observation.restarts > before.restarts;
  return sample.response.status !== 200 || restarted || sample.observation.state.OOMKilled === true;
}

export function workloadShouldStop(check: StopCheck, stopOnFailure: boolean): boolean {
  return stopOnFailure && sampleShowsFailure(check);
}
