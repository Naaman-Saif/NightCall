import type { ContainerInfo } from 'dockerode';

import { docker } from '../config/docker';
import { settings } from '../config/settings';
import type { ContainerReading, ProductionContainer, ProductionSource } from './series-sample';
import { withTimeout } from './with-timeout';

const CALL_TIMEOUT_MS = 5_000;
const knownLimits = new Map<string, number | null>();

function containerOf(info: ContainerInfo): ProductionContainer {
  const name = (info.Names[0] ?? info.Id).replace(/^\//, '');
  return { id: info.Id, name, service: info.Labels['com.docker.compose.service'] ?? name };
}

function isLongRunning(info: ContainerInfo): boolean {
  return info.Labels['com.docker.compose.oneoff'] !== 'True';
}

async function limitOf(id: string): Promise<number | null> {
  if (knownLimits.has(id)) return knownLimits.get(id) ?? null;
  const info = await withTimeout(docker.getContainer(id).inspect(), CALL_TIMEOUT_MS);
  const limit = info.HostConfig.Memory ? info.HostConfig.Memory : null;
  knownLimits.set(id, limit);
  return limit;
}

async function listContainers(): Promise<ProductionContainer[]> {
  const filters = { label: [`com.docker.compose.project=${settings.productionProject}`] };
  const infos = await withTimeout(docker.listContainers({ filters }), CALL_TIMEOUT_MS);
  return infos.filter(isLongRunning).map(containerOf);
}

async function readContainer(container: ProductionContainer): Promise<ContainerReading> {
  const statsCall = docker.getContainer(container.id).stats({ stream: false, 'one-shot': true });
  const [stats, limitBytes] = await Promise.all([withTimeout(statsCall, CALL_TIMEOUT_MS), limitOf(container.id)]);
  return { stats, limitBytes };
}

export const productionSource: ProductionSource = { containers: listContainers, read: readContainer };
