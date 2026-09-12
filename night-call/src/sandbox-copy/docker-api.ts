import type { ContainerInspectInfo, ContainerStats } from 'dockerode';

import { docker } from '../config/docker';
import { withinBudget } from './time-budget';

const apiTimeoutMs = 10_000;

export function inspectContainer(name: string): Promise<ContainerInspectInfo> {
  return withinBudget(docker.getContainer(name).inspect(), apiTimeoutMs);
}

export function oneShotStats(name: string): Promise<ContainerStats> {
  const options = { stream: false as const, 'one-shot': true };
  return withinBudget(docker.getContainer(name).stats(options), apiTimeoutMs);
}

export function connectToNetwork(change: { network: string; container: string }): Promise<unknown> {
  return withinBudget(docker.getNetwork(change.network).connect({ Container: change.container }), apiTimeoutMs);
}

export function disconnectFromNetwork(change: { network: string; container: string }): Promise<unknown> {
  const options = { Container: change.container, Force: true };
  return withinBudget(docker.getNetwork(change.network).disconnect(options), apiTimeoutMs);
}
