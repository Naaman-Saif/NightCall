import { abortDockerCommands } from './docker-cli';
import { requestInterrupt } from './stop-request';

const forcedExitMs = 300_000;

export function interruptSandbox(signal: NodeJS.Signals): number {
  requestInterrupt(signal);
  const abortedDockerCommands = abortDockerCommands();
  console.log(JSON.stringify({ interrupted: signal, abortedDockerCommands }));
  return abortedDockerCommands;
}

function onSignal(signal: NodeJS.Signals): void {
  interruptSandbox(signal);
  setTimeout(() => process.exit(130), forcedExitMs).unref();
}

export function installSignalHandlers(): void {
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) process.once(signal, onSignal);
}
