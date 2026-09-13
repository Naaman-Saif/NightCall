import type { RoundWorkload } from '../sandbox-copy/round-workload';
import type { WorkloadSummary } from '../sandbox-copy/workload-summary';

export type RoundRequest = {
  name: string;
  flagVariant: 'on' | 'off';
  restart: boolean;
  stopOnFailure: boolean;
  count: number;
  pacingMs: number;
  recipePath: string | null;
  speed: number;
  replayCapMs: number | null;
  requestCount: number | null;
};

export type WorkerCommandBody =
  | { command: 'start'; runId: string; sweepLeftovers: boolean }
  | { command: 'identity' }
  | { command: 'round'; round: RoundRequest }
  | { command: 'stop' };

export type WorkerCommand = WorkerCommandBody & { id: number };

export type WorkerProgress = { requests: number; errors: number; peakMemoryBytes: number; peakCpuPercent: number };

export type WorkerReply =
  | { id: number; kind: 'done'; value: unknown }
  | { id: number; kind: 'failed'; error: string }
  | { kind: 'progress'; progress: WorkerProgress };

export type RoundOutcome = {
  runFolder: string;
  name: string;
  summary: WorkloadSummary;
  oomEvents: { at: string }[];
  workload: RoundWorkload;
};

export type WarmStart = { runFolder: string };
