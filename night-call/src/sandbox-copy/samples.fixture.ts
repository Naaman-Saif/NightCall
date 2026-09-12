import type { Observation } from './observation';
import type { WorkloadSample } from './stop-rules';

export function observationWith(change: Partial<Observation>): Observation {
  const state = { Status: 'running', OOMKilled: false } as Observation['state'];
  return { memoryBytes: 1000, limitBytes: 10000, cpuPercent: 5, restarts: 0, state, image: 'sha256:a', ...change };
}

export function sampleWith(change: { status?: number | null; observation?: Partial<Observation> }): WorkloadSample {
  const response = { status: change.status === undefined ? 200 : change.status, products: 4 };
  return { at: 'now', index: 1, traceId: 't', response, observation: observationWith(change.observation ?? {}), requestMs: 10 };
}
