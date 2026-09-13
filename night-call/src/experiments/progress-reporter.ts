import type { EventWriter } from '../investigation/event-writer';
import { appendAsService } from '../investigation/service-append';
import type { ExperimentPlan } from './experiment-plan';
import type { Job } from './job-registry';
import type { WorkerProgress } from './worker-messages';

export type ProgressTarget = { plan: ExperimentPlan; job: Job };
export type ProgressReporter = { report(progress: WorkerProgress): void; flushed(): Promise<void> };

const REQUESTS_PER_EVENT = 25;

function progressDraft(plan: ExperimentPlan, progress: WorkerProgress) {
  const memoryMiB = Math.round(progress.peakMemoryBytes / 1024 / 1024);
  const summary = `${progress.requests} requests sent, ${progress.errors} failed, peak memory ${memoryMiB} MiB`;
  const payload = { experimentId: plan.experimentId, ...progress };
  return { actor: 'system' as const, type: 'experiment_progress' as const, summary, refs: [plan.experimentId], payload };
}

export function progressReporter(writer: EventWriter, target: ProgressTarget): ProgressReporter {
  let postedBuckets = 0;
  let posting = Promise.resolve();
  const report = (progress: WorkerProgress) => {
    target.job.progress = { requests: progress.requests, errors: progress.errors, peakMemoryBytes: progress.peakMemoryBytes, round: null };
    const bucket = Math.floor(progress.requests / REQUESTS_PER_EVENT);
    if (bucket <= postedBuckets) return;
    postedBuckets = bucket;
    const draft = progressDraft(target.plan, progress);
    posting = posting.then(() => appendAsService(writer, { incidentId: target.plan.incidentId, draft })).then(
      () => undefined,
      () => undefined,
    );
  };
  return { report, flushed: () => posting };
}
