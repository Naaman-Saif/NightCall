import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { flagFileInShop, recommendationSource, shopPath } from './constants';
import { inspectContainer } from './docker-api';
import { runDocker } from './docker-cli';

export interface ProductionIdentity {
  flagSha256: string;
  image: string;
  source: string;
}

export async function sourceChecksum(container: string): Promise<string> {
  const output = await runDocker({ args: ['exec', container, 'sha256sum', recommendationSource], timeoutMs: 30_000 });
  return output.trim();
}

export async function productionIdentity(): Promise<ProductionIdentity> {
  const flagSha256 = createHash('sha256').update(readFileSync(join(shopPath, flagFileInShop))).digest('hex');
  const info = await inspectContainer('recommendation');
  return { flagSha256, image: info.Image, source: await sourceChecksum('recommendation') };
}

export function identitiesMatch(before: ProductionIdentity, after: ProductionIdentity): boolean {
  return before.flagSha256 === after.flagSha256 && before.image === after.image && before.source === after.source;
}
