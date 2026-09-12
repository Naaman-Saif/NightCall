import { stopSandbox } from './cleanup';
import { requestInterrupt } from './stop-request';

const forcedExitMs = 300_000;

function onSignal(signal: NodeJS.Signals): void {
  console.log(JSON.stringify({ interrupted: signal }));
  requestInterrupt(signal);
  stopSandbox().catch((error: unknown) => console.error(JSON.stringify({ cleanupFailed: String(error) })));
  setTimeout(() => process.exit(130), forcedExitMs).unref();
}

export function installSignalHandlers(): void {
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) process.once(signal, onSignal);
}
