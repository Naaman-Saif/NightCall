import { createInterface } from 'node:readline';

import { stopSandbox } from '../sandbox-copy/cleanup';
import { interruptSandbox } from '../sandbox-copy/signals';
import { startBudget } from '../sandbox-copy/time-budget';
import { runCommand } from './worker-commands';
import type { WorkerCommand, WorkerReply } from './worker-messages';
import { createProgressTracker, type ProgressTracker } from './worker-progress';

function send(reply: WorkerReply): void {
  process.stdout.write(`${JSON.stringify(reply)}\n`);
}

function sendProgressFrom(tracker: ProgressTracker): void {
  console.log = (...parts: unknown[]) => {
    const line = parts.map((part) => (typeof part === 'string' ? part : JSON.stringify(part))).join(' ');
    process.stderr.write(`${line}\n`);
    const progress = tracker.take(line);
    if (progress) send({ kind: 'progress', progress });
  };
}

function commandOf(line: string): WorkerCommand | null {
  try {
    return JSON.parse(line) as WorkerCommand;
  } catch {
    return null;
  }
}

async function answer(line: string, tracker: ProgressTracker): Promise<void> {
  const command = commandOf(line);
  if (!command) return;
  if (command.command === 'round') tracker.reset();
  try {
    send({ id: command.id, kind: 'done', value: (await runCommand(command)) ?? null });
  } catch (error) {
    send({ id: command.id, kind: 'failed', error: String(error) });
  }
}

function stopAndExit(code: number): void {
  stopSandbox()
    .catch((error: unknown) => console.error(JSON.stringify({ cleanupFailed: String(error) })))
    .finally(() => process.exit(code));
}

function onSignal(signal: NodeJS.Signals): void {
  interruptSandbox(signal);
  stopAndExit(143);
}

function main(): void {
  startBudget();
  const tracker = createProgressTracker();
  sendProgressFrom(tracker);
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) process.once(signal, onSignal);
  let queue = Promise.resolve();
  const lines = createInterface({ input: process.stdin });
  lines.on('line', (line) => {
    queue = queue.then(() => answer(line, tracker));
  });
  lines.on('close', () => void queue.then(() => stopAndExit(0)));
}

main();
