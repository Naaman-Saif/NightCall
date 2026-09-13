import type { WorkerProgress } from './worker-messages';

export type ProgressTracker = { reset(): void; take(line: string): WorkerProgress | null };

type WorkloadLine = { stage?: unknown; request?: unknown; status?: unknown; memoryBytes?: unknown; cpuPercent?: unknown };

const NO_PROGRESS: WorkerProgress = { requests: 0, errors: 0, peakMemoryBytes: 0, peakCpuPercent: 0 };

function parsedLine(line: string): WorkloadLine | null {
  try {
    const value = JSON.parse(line) as WorkloadLine;
    return typeof value === 'object' && value !== null && typeof value.request === 'number' && 'stage' in value ? value : null;
  } catch {
    return null;
  }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

export function advancedProgress(progress: WorkerProgress, line: WorkloadLine): WorkerProgress {
  return {
    requests: Math.max(progress.requests, numberOr(line.request, 0)),
    errors: progress.errors + (line.status === 200 ? 0 : 1),
    peakMemoryBytes: Math.max(progress.peakMemoryBytes, numberOr(line.memoryBytes, 0)),
    peakCpuPercent: Math.max(progress.peakCpuPercent, numberOr(line.cpuPercent, 0)),
  };
}

export function createProgressTracker(): ProgressTracker {
  let progress = NO_PROGRESS;
  return {
    reset: () => {
      progress = NO_PROGRESS;
    },
    take: (text) => {
      const line = parsedLine(text);
      if (!line) return null;
      progress = advancedProgress(progress, line);
      return progress;
    },
  };
}
