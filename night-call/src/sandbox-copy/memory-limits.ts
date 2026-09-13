import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { sandboxContainerName } from './constants';
import { inspectContainer } from './docker-api';
import type { ServiceIdentity } from './isolate-service';
import { writeJson } from './run-files';

export type LimitCheck = { service: string; productionBytes: number; sandboxBytes: number | null; matches: boolean };

async function limitCheckOf(service: string, productionBytes: number): Promise<LimitCheck> {
  const info = await inspectContainer(sandboxContainerName(service)).catch(() => null);
  const sandboxBytes = info ? (info.HostConfig.Memory ?? 0) : null;
  return { service, productionBytes, sandboxBytes, matches: sandboxBytes === productionBytes };
}

export function mismatchText(checks: LimitCheck[]): string {
  return checks
    .filter((check) => !check.matches)
    .map((check) => `${check.service} sandbox ${check.sandboxBytes} production ${check.productionBytes}`)
    .join(', ');
}

export async function requireProductionMemoryLimits(runFolder: string): Promise<LimitCheck[]> {
  const identities = JSON.parse(readFileSync(join(runFolder, 'images.json'), 'utf8')) as Record<string, ServiceIdentity>;
  const entries = Object.entries(identities);
  const checks = await Promise.all(entries.map(([service, identity]) => limitCheckOf(service, identity.memoryLimit)));
  const allMatch = checks.every((check) => check.matches);
  writeJson(join(runFolder, 'memory-limits.json'), { checkedAt: new Date().toISOString(), allMatch, checks });
  if (!allMatch) throw new Error(`sandbox memory limits differ from production: ${mismatchText(checks)}`);
  return checks;
}
