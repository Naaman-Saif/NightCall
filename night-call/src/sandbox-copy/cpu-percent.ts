import type { ContainerStats } from 'dockerode';

export interface CpuReading {
  containerTotal: number;
  systemTotal: number;
  onlineCpus: number;
}

export interface CpuReadings {
  previous: CpuReading | null;
  current: CpuReading;
}

export function cpuReadingOf(stats: ContainerStats): CpuReading {
  const cpu = stats.cpu_stats;
  const onlineCpus = cpu?.online_cpus || cpu?.cpu_usage?.percpu_usage?.length || 1;
  return { containerTotal: cpu?.cpu_usage?.total_usage ?? 0, systemTotal: cpu?.system_cpu_usage ?? 0, onlineCpus };
}

export function isRunningReading(reading: CpuReading): boolean {
  return reading.systemTotal > 0;
}

export function cpuPercent(readings: CpuReadings): number | null {
  const { previous, current } = readings;
  if (!previous) return null;
  if (!isRunningReading(current)) return 0;
  const restarted = current.containerTotal < previous.containerTotal;
  const containerChange = restarted ? current.containerTotal : current.containerTotal - previous.containerTotal;
  const systemChange = current.systemTotal - previous.systemTotal;
  if (systemChange <= 0) return null;
  return Math.round((containerChange / systemChange) * current.onlineCpus * 10000) / 100;
}
