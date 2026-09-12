import { hostname } from 'node:os';

import { sandboxNetwork } from './constants';
import { connectToNetwork, disconnectFromNetwork, inspectContainer } from './docker-api';

function runnerContainer(): string {
  return hostname();
}

async function runnerIsOnSandboxNetwork(): Promise<boolean> {
  const info = await inspectContainer(runnerContainer());
  return sandboxNetwork in info.NetworkSettings.Networks;
}

export async function joinSandboxNetwork(): Promise<void> {
  if (await runnerIsOnSandboxNetwork()) return;
  await connectToNetwork({ network: sandboxNetwork, container: runnerContainer() });
}

export async function leaveSandboxNetwork(): Promise<void> {
  if (!(await runnerIsOnSandboxNetwork())) return;
  await disconnectFromNetwork({ network: sandboxNetwork, container: runnerContainer() });
}
