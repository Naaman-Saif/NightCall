import type { ContainerStats } from 'dockerode';

type MemoryFigures = { usage?: number; stats?: { inactive_file?: number; total_inactive_file?: number } };

export function memoryInUse(stats: ContainerStats): number | null {
  const memory = stats.memory_stats as MemoryFigures | undefined;
  if (typeof memory?.usage !== 'number') return null;
  const inactive = memory.stats?.inactive_file ?? memory.stats?.total_inactive_file ?? 0;
  return Math.max(0, memory.usage - inactive);
}
