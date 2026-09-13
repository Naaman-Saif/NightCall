import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter } from 'node:events';

import type { CheckOutcome, Verdict } from './evaluate-checks';

export type JobKind = 'experiment' | 'verification';
export type JobState = 'queued' | 'running' | 'finished' | 'failed';
export type JobProgress = { requests: number; errors: number; peakMemoryBytes: number; round: number | null };
export type JobResult = {
  experimentId: string | null;
  verificationRunId: string | null;
  verdict: Verdict;
  checks: CheckOutcome[];
  failureReason: string | null;
};
export type Job = { jobId: string; kind: JobKind; state: JobState; progress: JobProgress; result: JobResult | null };
export type JobWait = { jobId: string; waitSeconds: number; stop: AbortSignal };

function isSettled(job: Job): boolean {
  return job.state === 'finished' || job.state === 'failed';
}

@Injectable()
export class JobRegistry {
  private readonly jobs = new Map<string, Job>();
  private readonly settled = new EventEmitter();

  open(kind: JobKind): Job {
    const busy = [...this.jobs.values()].find((job) => !isSettled(job));
    if (busy) throw new ConflictException({ code: 'job_running', jobId: busy.jobId });
    const jobId = `job-${Date.now().toString(36)}`;
    const job: Job = { jobId, kind, state: 'queued', progress: { requests: 0, errors: 0, peakMemoryBytes: 0, round: null }, result: null };
    this.jobs.set(jobId, job);
    return job;
  }

  run(job: Job, work: (job: Job) => Promise<JobResult>): Promise<void> {
    job.state = 'running';
    const failed = (error: unknown): JobResult => ({ experimentId: null, verificationRunId: null, verdict: 'failed', checks: [], failureReason: String(error) });
    return work(job)
      .catch(failed)
      .then((result) => {
        job.result = result;
        job.state = result.verdict === 'failed' ? 'failed' : 'finished';
        this.settled.emit(job.jobId);
      });
  }

  discard(job: Job): void {
    this.jobs.delete(job.jobId);
  }

  find(jobId: string): Job {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException({ code: 'job_not_found', jobId });
    return job;
  }

  async waitFor(wait: JobWait): Promise<Job> {
    const job = this.find(wait.jobId);
    if (isSettled(job) || wait.waitSeconds === 0) return job;
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.settled.off(job.jobId, done);
        resolve();
      };
      const timer = setTimeout(done, wait.waitSeconds * 1000);
      this.settled.on(job.jobId, done);
      wait.stop.addEventListener('abort', done, { once: true });
    });
    return job;
  }
}
