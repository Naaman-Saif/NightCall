import { sandboxNetwork, sandboxProject } from './constants';
import { runDocker } from './docker-cli';
import { sleep } from './time-budget';

export type LateSweep = { containersRemoved: string[]; networkRemoved: boolean };

const SETTLE_MS = 5_000;

async function removeLateContainers(): Promise<string[]> {
  const filter = `label=com.docker.compose.project=${sandboxProject}`;
  const listed = await runDocker({ args: ['ps', '-aq', '--filter', filter], timeoutMs: 30_000 });
  const ids = listed.split('\n').filter((id) => id.trim() !== '');
  if (ids.length > 0) await runDocker({ args: ['rm', '-f', '--volumes', ...ids], timeoutMs: 60_000 });
  return ids;
}

async function removeLeftoverNetwork(): Promise<boolean> {
  const filter = `name=^${sandboxNetwork}$`;
  const listed = await runDocker({ args: ['network', 'ls', '-q', '--filter', filter], timeoutMs: 30_000 });
  if (listed.trim() === '') return false;
  await runDocker({ args: ['network', 'rm', sandboxNetwork], timeoutMs: 30_000 });
  return true;
}

export async function sweepLateSandboxResources(): Promise<LateSweep> {
  await sleep(SETTLE_MS);
  const containersRemoved = await removeLateContainers();
  const networkRemoved = await removeLeftoverNetwork();
  return { containersRemoved, networkRemoved };
}
