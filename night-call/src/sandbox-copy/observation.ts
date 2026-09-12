import type { ContainerInspectInfo } from 'dockerode';

import { sandboxContainerName } from './constants';
import { cpuPercent, cpuReadingOf, isRunningReading, type CpuReading } from './cpu-percent';
import { inspectContainer, oneShotStats } from './docker-api';

export interface Observation {
  memoryBytes: number | null;
  limitBytes: number | null;
  cpuPercent: number | null;
  restarts: number;
  state: ContainerInspectInfo['State'];
  image: string;
}

export interface Observer {
  observe(): Promise<Observation>;
}

async function readRecommendation(previous: CpuReading | null): Promise<Observation & { cpu: CpuReading }> {
  const name = sandboxContainerName('recommendation');
  const [info, stats] = await Promise.all([inspectContainer(name), oneShotStats(name)]);
  const cpu = cpuReadingOf(stats);
  const memory = stats.memory_stats;
  return {
    memoryBytes: memory?.usage ?? null,
    limitBytes: memory?.limit ?? null,
    cpuPercent: cpuPercent({ previous, current: cpu }),
    restarts: info.RestartCount,
    state: info.State,
    image: info.Image,
    cpu,
  };
}

export function createObserver(): Observer {
  let previous: CpuReading | null = null;
  return {
    observe: async () => {
      const { cpu, ...observation } = await readRecommendation(previous);
      if (isRunningReading(cpu)) previous = cpu;
      return observation;
    },
  };
}
