import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { shopPath } from './constants';
import { isInside } from './run-files';

export interface ComposeMount {
  type: string;
  source?: string;
  target: string;
  read_only?: boolean;
}

export interface MountCopy {
  mount: ComposeMount;
  runFolder: string;
}

function copyWithSourceModes(paths: { source: string; target: string }): void {
  const previousUmask = process.umask(0o022);
  try {
    cpSync(paths.source, paths.target, { recursive: true, preserveTimestamps: true });
  } finally {
    process.umask(previousUmask);
  }
}

export function copyMount(copy: MountCopy): ComposeMount {
  const source = resolve(copy.mount.source ?? '');
  if (copy.mount.type !== 'bind' || !isInside(source, shopPath)) {
    throw new Error(`unsupported mount ${copy.mount.type} ${source} -> ${copy.mount.target}`);
  }
  const target = join(copy.runFolder, 'assets', relative(shopPath, source));
  mkdirSync(dirname(target), { recursive: true });
  if (!existsSync(target)) copyWithSourceModes({ source, target });
  return { type: 'bind', source: target, target: copy.mount.target, read_only: true };
}
