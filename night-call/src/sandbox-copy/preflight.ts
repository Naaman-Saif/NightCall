import { existsSync } from 'node:fs';

import { cleanupMarkerPath, sandboxNetwork, sandboxProject } from './constants';
import { runDocker } from './docker-cli';

export async function requireNoProjectContainers(): Promise<void> {
  const filter = `label=com.docker.compose.project=${sandboxProject}`;
  const containers = await runDocker({ args: ['ps', '-aq', '--filter', filter], timeoutMs: 30_000 });
  if (containers.trim()) throw new Error(`${sandboxProject} containers already exist`);
}

export async function requireNoSandboxNetwork(): Promise<void> {
  const filter = `name=^${sandboxNetwork}$`;
  const networks = await runDocker({ args: ['network', 'ls', '-q', '--filter', filter], timeoutMs: 30_000 });
  if (networks.trim()) throw new Error(`${sandboxNetwork} already exists`);
}

export async function preflight(runFolder: string): Promise<void> {
  if (existsSync(cleanupMarkerPath)) throw new Error(`previous cleanup failed, see ${cleanupMarkerPath}`);
  if (existsSync(runFolder)) throw new Error(`run folder ${runFolder} already exists`);
  await requireNoProjectContainers();
  await requireNoSandboxNetwork();
}
