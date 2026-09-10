import { docker } from '../config/docker';
import { cloneNetworkName, nightCallContainerName } from '../config/targets';

export async function joinCloneNetwork(): Promise<void> {
  await docker.getNetwork(cloneNetworkName).connect({ Container: nightCallContainerName }).catch(() => undefined);
}

export async function leaveCloneNetwork(): Promise<void> {
  await docker.getNetwork(cloneNetworkName).disconnect({ Container: nightCallContainerName, Force: true }).catch(() => undefined);
}
