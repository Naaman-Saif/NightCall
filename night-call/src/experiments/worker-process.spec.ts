import { ConflictException } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import { JobRegistry, type JobResult } from './job-registry';
import { createProgressTracker } from './worker-progress';
import { WorkerProcess, type WorkerChild } from './worker-process';

function fakeChild() {
  const exits = new EventEmitter();
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const sent: Record<string, unknown>[] = [];
  stdin.on('data', (chunk: Buffer) => chunk.toString().trim().split('\n').forEach((line) => sent.push(JSON.parse(line))));
  const child: WorkerChild = { stdin, stdout, kill: () => exits.emit('exit', 143), once: (event, listener) => exits.once(event, listener) };
  const reply = (value: unknown) => stdout.write(`${JSON.stringify(value)}\n`);
  return { child, sent, reply };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));
const matched: JobResult = { experimentId: 'exp-1', verificationRunId: null, verdict: 'matches', checks: [], failureReason: null };

describe('sandbox worker protocol', () => {
  it('answers requests by id, forwards progress and reports failures', async () => {
    const { child, sent, reply } = fakeChild();
    const worker = new WorkerProcess(child);
    const progress: number[] = [];
    worker.listen((update) => progress.push(update.requests));
    const identity = worker.request({ command: 'identity' });
    const start = worker.request({ command: 'start', runId: 'inc-1-a', sweepLeftovers: true });
    await tick();
    expect(sent.map((command) => [command.id, command.command])).toEqual([[1, 'identity'], [2, 'start']]);
    reply({ kind: 'progress', progress: { requests: 25, errors: 0, peakMemoryBytes: 1, peakCpuPercent: 1 } });
    reply({ id: 2, kind: 'failed', error: 'preflight refused' });
    reply({ id: 1, kind: 'done', value: { image: 'sha' } });
    await expect(start).rejects.toThrow('preflight refused');
    await expect(identity).resolves.toEqual({ image: 'sha' });
    expect(progress).toEqual([25]);
  });

  it('rejects waiting requests when the worker is stopped', async () => {
    const { child } = fakeChild();
    const worker = new WorkerProcess(child);
    const round = worker.request({ command: 'stop' });
    expect(await worker.stop()).toBe(143);
    await expect(round).rejects.toThrow('exited with code 143');
  });

  it('turns workload lines into cumulative progress', () => {
    const tracker = createProgressTracker();
    expect(tracker.take('not json')).toBeNull();
    tracker.take(JSON.stringify({ stage: 'exp-1', request: 1, status: 200, memoryBytes: 10, cpuPercent: 5 }));
    const latest = tracker.take(JSON.stringify({ stage: 'exp-1', request: 26, status: 500, memoryBytes: 30, cpuPercent: 2 }));
    expect(latest).toEqual({ requests: 26, errors: 1, peakMemoryBytes: 30, peakCpuPercent: 5 });
  });
});

describe('job registry', () => {
  it('runs one job at a time and wakes waiters when it settles', async () => {
    const registry = new JobRegistry();
    const job = registry.open('experiment');
    expect(() => registry.open('experiment')).toThrow(ConflictException);
    let finish: (result: JobResult) => void = () => undefined;
    const running = registry.run(job, () => new Promise((resolve) => (finish = resolve)));
    const waiting = registry.waitFor({ jobId: job.jobId, waitSeconds: 5, stop: new AbortController().signal });
    expect((await registry.waitFor({ jobId: job.jobId, waitSeconds: 0, stop: new AbortController().signal })).state).toBe('running');
    finish(matched);
    await running;
    expect(await waiting).toMatchObject({ state: 'finished', result: matched });
    expect(registry.open('experiment').state).toBe('queued');
  });

  it('marks a thrown job failed with the reason', async () => {
    const registry = new JobRegistry();
    const job = registry.open('experiment');
    await registry.run(job, () => Promise.reject(new Error('docker gone')));
    expect(job).toMatchObject({ state: 'failed', result: { verdict: 'failed', failureReason: 'Error: docker gone' } });
  });
});
