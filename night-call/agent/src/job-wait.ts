import { setTimeout as sleep } from 'node:timers/promises';

import type { JobPoller, JobResult } from './proof-types.js';
import { NotReady, timeLeftMs, type RunContext } from './run-steps.js';

const QUICK_REPLY_MS = 1_000;
const PAUSE_AFTER_QUICK_REPLY_MS = 5_000;

export type JobWatch = { jobId: string; poller: JobPoller };

export async function waitForJobEnd(context: RunContext, watch: JobWatch): Promise<JobResult> {
  if (timeLeftMs(context.run) === 0) throw new NotReady('the run budget ran out while the job was running');
  const startedAt = context.run.now();
  const result = await context.proof.waitForJob(watch.jobId, watch.poller);
  if (result.state !== 'running') return result;
  if (context.run.now() - startedAt < QUICK_REPLY_MS) await sleep(PAUSE_AFTER_QUICK_REPLY_MS);
  return waitForJobEnd(context, watch);
}
