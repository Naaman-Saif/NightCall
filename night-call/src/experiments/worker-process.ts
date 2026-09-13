import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';

import type { WorkerCommandBody, WorkerProgress, WorkerReply } from './worker-messages';

export type WorkerChild = {
  stdin: Writable;
  stdout: Readable;
  kill(signal: NodeJS.Signals): boolean;
  once(event: 'exit', listener: (code: number | null) => void): unknown;
};

type Pending = { resolve(value: unknown): void; reject(error: Error): void };
export type ProgressListener = (progress: WorkerProgress) => void;

const FORCED_STOP_MS = 300_000;

function replyOf(line: string): WorkerReply | null {
  try {
    return JSON.parse(line) as WorkerReply;
  } catch {
    return null;
  }
}

export class WorkerProcess {
  private readonly pending = new Map<number, Pending>();
  private listener: ProgressListener = () => undefined;
  private sentCommands = 0;
  private exitCode: number | null | undefined = undefined;
  readonly exited: Promise<number | null>;

  constructor(private readonly child: WorkerChild) {
    createInterface({ input: child.stdout }).on('line', (line) => this.receive(line));
    this.exited = new Promise((resolve) => child.once('exit', (code) => resolve(this.failAll(code))));
  }

  request<Value>(body: WorkerCommandBody): Promise<Value> {
    if (this.exitCode !== undefined) return Promise.reject(new Error(`sandbox worker exited with code ${this.exitCode}`));
    this.sentCommands += 1;
    const id = this.sentCommands;
    const answered = new Promise<Value>((resolve, reject) => this.pending.set(id, { resolve: resolve as Pending['resolve'], reject }));
    this.child.stdin.write(`${JSON.stringify({ ...body, id })}\n`);
    return answered;
  }

  listen(listener: ProgressListener): void {
    this.listener = listener;
  }

  stop(): Promise<number | null> {
    this.child.kill('SIGTERM');
    const forced = setTimeout(() => this.child.kill('SIGKILL'), FORCED_STOP_MS);
    return this.exited.finally(() => clearTimeout(forced));
  }

  private receive(line: string): void {
    const reply = replyOf(line);
    if (!reply) return;
    if (reply.kind === 'progress') return this.listener(reply.progress);
    const pending = this.pending.get(reply.id);
    this.pending.delete(reply.id);
    if (reply.kind === 'done') pending?.resolve(reply.value);
    else pending?.reject(new Error(reply.error));
  }

  private failAll(code: number | null): number | null {
    this.exitCode = code;
    for (const pending of this.pending.values()) pending.reject(new Error(`sandbox worker exited with code ${code}`));
    this.pending.clear();
    return code;
  }
}

export function spawnWorker(): WorkerProcess {
  const child = spawn(process.execPath, [join(__dirname, 'sandbox-worker.js')], { stdio: ['pipe', 'pipe', 'inherit'] });
  return new WorkerProcess(child);
}
