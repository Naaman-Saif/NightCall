import type { WorkloadSample } from '../sandbox-copy/stop-rules';
import type { WorkloadSummary } from '../sandbox-copy/workload-summary';
import type { Observations } from './evaluate-checks';

export type RoundFacts = { summary: WorkloadSummary; oomEventCount: number; samples: WorkloadSample[] };

function memoryShare(summary: WorkloadSummary): number | null {
  const { peakMemoryBytes, limitBytes } = summary;
  if (peakMemoryBytes === null || limitBytes === null || limitBytes <= 0) return null;
  return Math.round((peakMemoryBytes / limitBytes) * 1000) / 1000;
}

function healthyRequests(samples: WorkloadSample[]): number {
  return samples.filter((sample) => sample.response.status === 200 && sample.response.products !== 0).length;
}

export function observationsOf(facts: RoundFacts): Observations {
  const { summary } = facts;
  return {
    'fault.oom_kills': facts.oomEventCount,
    'fault.http_failures': summary.errors,
    'mitigated.http_failures': summary.errors,
    'mitigated.restarts': summary.restartsAfter - summary.restartsBefore,
    'mitigated.healthy_requests': healthyRequests(facts.samples),
    'mitigated.peak_memory_share': memoryShare(summary),
  };
}
