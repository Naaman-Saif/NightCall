import { sandboxContainerName, sandboxNetwork } from './constants';
import { inspectContainer } from './docker-api';

export async function containerAddress(service: string): Promise<string> {
  const info = await inspectContainer(sandboxContainerName(service));
  const address = info.NetworkSettings.Networks[sandboxNetwork]?.IPAddress;
  if (!address) throw new Error(`${service} has no address on ${sandboxNetwork}`);
  return address;
}
