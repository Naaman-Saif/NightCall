import type { ContainerStats } from 'dockerode';

import type { ContainerReading, ProductionContainer, ProductionSource } from './series-sample';

export type FakeReading = { usage: number; inactive: number; limitBytes: number | null; cpuTotal: number; systemTotal: number };

export function statsOf(reading: FakeReading): ContainerStats {
  const memory_stats = { usage: reading.usage, stats: { inactive_file: reading.inactive } };
  const cpu_stats = { cpu_usage: { total_usage: reading.cpuTotal }, system_cpu_usage: reading.systemTotal, online_cpus: 2 };
  return { memory_stats, cpu_stats } as unknown as ContainerStats;
}

export class FakeSource implements ProductionSource {
  readonly readings = new Map<string, FakeReading>();
  failing = new Set<string>();
  pause: Promise<void> | null = null;

  async containers(): Promise<ProductionContainer[]> {
    return [...this.readings.keys()].map((service) => ({ id: service, name: service, service }));
  }

  async read(container: ProductionContainer): Promise<ContainerReading> {
    await this.pause;
    if (this.failing.has(container.service)) throw new Error('container restarting');
    const reading = this.readings.get(container.service) as FakeReading;
    return { stats: statsOf(reading), limitBytes: reading.limitBytes };
  }
}
