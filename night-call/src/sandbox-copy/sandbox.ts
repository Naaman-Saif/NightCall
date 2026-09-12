import { join } from 'node:path';

import { buildSandboxCompose } from './build-sandbox-compose';
import { recommendationOomEvents, startEvents, type EventsStream } from './docker-events';
import { preflight } from './preflight';
import { restartRecommendation } from './restart-recommendation';
import { createRunFolder, runFolderFor, writeJson } from './run-files';
import { setSandboxFlag } from './sandbox-flag';
import { bringStackUp } from './stack-ready';
import { requireNotInterrupted } from './stop-request';
import { sleep } from './time-budget';
import { runWorkload } from './workload';
import type { WorkloadSummary } from './workload-summary';

export interface SandboxSession {
  runFolder: string;
  endpoint: string;
  events: EventsStream | null;
  startedAt: Date;
}

export interface RoundOptions {
  name?: string;
  flagVariant?: string;
  restart: boolean;
  count: number;
  pacingMs: number;
  stopOnFailure: boolean;
}

export interface RoundResult {
  name: string;
  summary: WorkloadSummary;
  oomEvents: unknown[];
}

const state: { session: SandboxSession | null; runFolder: string | null; rounds: number } = { session: null, runFolder: null, rounds: 0 };

export function currentSandbox(): SandboxSession {
  if (!state.session) throw new Error('sandbox is not started');
  return state.session;
}

export function sandboxIsStarted(): boolean {
  return state.session !== null;
}

export function preparedRunFolder(): string | null {
  return state.runFolder;
}

export function forgetSandbox(): void {
  state.session = null;
}

export async function prepareSandbox(runId: string): Promise<string> {
  requireNotInterrupted();
  const runFolder = runFolderFor(runId);
  await preflight(runFolder);
  createRunFolder(runFolder);
  state.runFolder = runFolder;
  state.session = { runFolder, endpoint: '', events: null, startedAt: new Date() };
  await buildSandboxCompose(runFolder);
  setSandboxFlag({ runFolder, variant: 'off' });
  return runFolder;
}

export async function startSandbox(runId: string): Promise<SandboxSession> {
  const runFolder = await prepareSandbox(runId);
  const session = currentSandbox();
  session.events = startEvents(runFolder);
  session.startedAt = new Date();
  session.endpoint = await bringStackUp(runFolder);
  return session;
}

export async function runRound(options: RoundOptions): Promise<RoundResult> {
  const { runFolder, endpoint } = currentSandbox();
  state.rounds += 1;
  const name = options.name ?? `round-${state.rounds}`;
  if (options.flagVariant) setSandboxFlag({ runFolder, variant: options.flagVariant });
  if (options.restart) await restartRecommendation(runFolder);
  const sinceSeconds = Math.floor(Date.now() / 1000);
  const plan = { name, count: options.count, pacingMs: options.pacingMs, stopOnFailure: options.stopOnFailure };
  const summary = await runWorkload(plan, { runFolder, endpoint });
  await sleep(2000);
  const oomEvents = recommendationOomEvents(runFolder, sinceSeconds);
  writeJson(join(runFolder, `${name}-oom-events.json`), oomEvents);
  return { name, summary, oomEvents };
}
