import { sandboxContainerName, snapshotServices } from './constants';
import { inspectContainer } from './docker-api';
import { writeJson } from './run-files';

async function snapshotOf(service: string): Promise<Record<string, unknown>> {
  const info = await inspectContainer(sandboxContainerName(service));
  const { PortBindings, NetworkMode, Privileged, PidMode } = info.HostConfig;
  return {
    Id: info.Id,
    Image: info.Image,
    State: info.State,
    RestartCount: info.RestartCount,
    Networks: info.NetworkSettings.Networks,
    Ports: info.NetworkSettings.Ports,
    Mounts: info.Mounts,
    HostConfig: { PortBindings, NetworkMode, Privileged, PidMode },
  };
}

export async function snapshotContainers(path: string): Promise<void> {
  const snapshot: Record<string, unknown> = {};
  for (const service of snapshotServices) snapshot[service] = await snapshotOf(service);
  writeJson(path, snapshot);
}
