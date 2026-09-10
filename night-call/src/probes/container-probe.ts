import { docker } from '../config/docker';
import { containerNameFor, type StackTarget } from '../config/targets';
import { failed, reading, type ProbeReading } from './reading';

const recentRestartMs = 3 * 60 * 1000;
const cpuCeilingPercent = 150;

export async function containerReading(target: StackTarget, service: string): Promise<ProbeReading> {
  const name = `container_${service}`;
  const info = await docker.getContainer(containerNameFor(target, service)).inspect();
  const restarts = info.RestartCount ?? 0;
  const running = info.State?.Status === 'running';
  const startedAgo = Date.now() - Date.parse(info.State?.StartedAt ?? '');
  const restartedRecently = restarts > 0 && startedAgo < recentRestartMs;
  if (!running) return failed(name, -1);
  return restartedRecently ? failed(name, restarts) : reading(name, restarts);
}

interface CpuStats { cpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage: number; online_cpus?: number }; precpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage: number } }

export function cpuPercentOf(stats: CpuStats): number {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  if (systemDelta <= 0 || cpuDelta < 0) return 0;
  return Number(((cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus ?? 1) * 100).toFixed(1));
}

export async function cpuReading(target: StackTarget, service: string): Promise<ProbeReading> {
  const stats = (await docker.getContainer(containerNameFor(target, service)).stats({ stream: false })) as unknown as CpuStats;
  const percent = cpuPercentOf(stats);
  return percent > cpuCeilingPercent ? failed(`cpu_${service}`, percent) : reading(`cpu_${service}`, percent);
}
