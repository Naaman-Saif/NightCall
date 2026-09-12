import { join } from 'node:path';

import { readFlagdConfig, setFlagInFile } from '../sandbox/flagd-file';
import { cacheFlag, flagFileInShop } from './constants';

interface FlagWithVariants {
  defaultVariant?: string;
  variants?: Record<string, unknown>;
}

export interface FlagChange {
  runFolder: string;
  variant: string;
}

function cacheFlagIn(path: string): FlagWithVariants {
  const flag = readFlagdConfig(path).flags[cacheFlag] as FlagWithVariants | undefined;
  if (!flag) throw new Error(`${cacheFlag} is missing from ${path}`);
  return flag;
}

export function setSandboxFlag(change: FlagChange): void {
  const path = join(change.runFolder, 'assets', flagFileInShop);
  const variants = cacheFlagIn(path).variants ?? {};
  if (!(change.variant in variants)) throw new Error(`${cacheFlag} has no variant ${change.variant}`);
  setFlagInFile(path, { flag: cacheFlag, to: change.variant });
  const written = cacheFlagIn(path).defaultVariant;
  if (written !== change.variant) throw new Error(`${cacheFlag} reads ${written} after writing ${change.variant}`);
}
