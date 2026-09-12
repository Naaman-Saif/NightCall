import { join } from 'node:path';

import { productionComposeFiles, productionProject, shopPath } from './constants';
import { runDocker } from './docker-cli';

export type ComposeDocument = Record<string, unknown> & { services: Record<string, ComposeService> };
export type ComposeService = Record<string, unknown>;

function renderArguments(): string[] {
  const envFiles = ['--env-file', join(shopPath, '.env'), '--env-file', join(shopPath, '.env.override')];
  const files = productionComposeFiles.flatMap((file) => ['-f', join(shopPath, file)]);
  return ['compose', '--project-directory', shopPath, ...envFiles, '-p', productionProject, ...files];
}

export async function renderProductionCompose(): Promise<ComposeDocument> {
  const output = await runDocker({ args: [...renderArguments(), 'config', '--format', 'json'], timeoutMs: 60_000 });
  return JSON.parse(output) as ComposeDocument;
}
