import type { Observation } from './observation';
import { sampleShowsFailure, type WorkloadSample } from './stop-rules';

export interface SummaryInput {
  samples: WorkloadSample[];
  before: Observation;
  after: Observation;
  elapsedMs: number;
}

export interface WorkloadSummary {
  startedAt: string | null;
  count: number;
  errors: number;
  emptyResponses: number;
  peakMemoryBytes: number | null;
  peakCpuPercent: number | null;
  limitBytes: number | null;
  restartsBefore: number;
  restartsAfter: number;
  elapsedSeconds: number;
  elapsedMinutes: number;
  firstFailureRequest: number | null;
}

function peak(values: (number | null)[]): number | null {
  const numbers = values.filter((value): value is number => value !== null);
  return numbers.length ? Math.max(...numbers) : null;
}

export function summarizeWorkload(input: SummaryInput): WorkloadSummary {
  const { samples } = input;
  const failing = samples.findIndex((sample) => sampleShowsFailure({ sample, before: input.before }));
  return {
    firstFailureRequest: failing === -1 ? null : failing + 1,
    startedAt: samples[0]?.at ?? null,
    count: samples.length,
    errors: samples.filter((sample) => sample.response.status !== 200).length,
    emptyResponses: samples.filter((sample) => sample.response.products === 0).length,
    peakMemoryBytes: peak(samples.map((sample) => sample.observation.memoryBytes)),
    peakCpuPercent: peak(samples.map((sample) => sample.observation.cpuPercent)),
    limitBytes: input.before.limitBytes,
    restartsBefore: input.before.restarts,
    restartsAfter: input.after.restarts,
    elapsedSeconds: Math.round(input.elapsedMs / 10) / 100,
    elapsedMinutes: Math.round(input.elapsedMs / 600) / 100,
  };
}

export function workloadIsHealthy(summary: WorkloadSummary, expectedCount: number): boolean {
  const responses = summary.count === expectedCount && summary.errors === 0 && summary.emptyResponses === 0;
  return responses && summary.restartsAfter === summary.restartsBefore;
}
