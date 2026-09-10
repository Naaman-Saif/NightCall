import { join } from 'node:path';

import { settings } from './settings';

export interface StackTarget {
  project: string;
  flagdConfigPath: string;
}

export const watchedServices = [
  'ad', 'cart', 'checkout', 'currency', 'email', 'frontend', 'frontend-proxy',
  'payment', 'product-catalog', 'quote', 'recommendation', 'shipping', 'flagd',
  'kafka', 'accounting', 'fraud-detection',
];

export function productionTarget(): StackTarget {
  return { project: settings.productionProject, flagdConfigPath: settings.flagdConfigPath };
}

export function sandboxTarget(): StackTarget {
  return { project: settings.sandboxProject, flagdConfigPath: join(settings.astronomyShopPath, 'clone/flagd/demo.flagd.json') };
}

export function targetIsProduction(target: StackTarget): boolean {
  return target.project === settings.productionProject;
}

export function containerNameFor(target: StackTarget, service: string): string {
  return targetIsProduction(target) ? service : `${target.project}-${service}`;
}

export const cloneNetworkName = 'night-call-clone';
export const nightCallContainerName = 'night-call';
