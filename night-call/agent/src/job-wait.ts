import { setTimeout as sleep } from 'node:timers/promises';

import type { JobPoller, JobResult } from './proof-types.js';
import { NotReady, type RunContext, type RunState } from './run-steps.js';

const QUICK_REPLY_MS = 1_000;
const PAUSE_AFTER_QUICK_REPLY_MS = 5_000;
const ESTIMATE_MARGIN_MINUTES = 2;

export type JobWatch = { jobId: string; poller: JobPoller; until: number };

export function waitLimit(run: RunState, wait: { capMinutes: number; estimatedMinutes: number | null }): number {
  const minutes = Math.max(wait.capMinutes, (wait.estimatedMinutes ?? 0) + ESTIMATE_MARGIN_MINUTES);
  return Math.min(run.deadline, run.now() + minutes * 60_000);
}

export async function waitForJobEnd(context: RunContext, watch: JobWatch): Promise<JobResult> {
  if (context.run.now() >= Math.min(watch.until, context.run.deadline)) throw new NotReady('it ran out of time');
  const startedAt = context.run.now();
  const result = await context.proof.waitForJob(watch.jobId, watch.poller);
  if (result.state !== 'running') return result;
  if (context.run.now() - startedAt < QUICK_REPLY_MS) await sleep(PAUSE_AFTER_QUICK_REPLY_MS);
  return waitForJobEnd(context, watch);
}
