import { readFileSync, writeFileSync } from 'node:fs';

import { defaultVariantIn, withDefaultVariant } from './flag-text';

export const SHOP_FLAG = 'recommendationCacheFailure';

export type FlagSwitch = { flag: string; before: string | null; after: string | null };

function requestedVariant(args: string[]): string {
  const [variant, flag] = args;
  if (flag !== undefined && flag !== SHOP_FLAG) throw new Error(`only ${SHOP_FLAG} can be switched, not ${flag}`);
  if (variant !== 'on' && variant !== 'off') throw new Error('usage: set-shop-flag on|off');
  return variant;
}

export function setShopFlag(args: string[], flagFilePath: string): FlagSwitch {
  const variant = requestedVariant(args);
  const text = readFileSync(flagFilePath, 'utf8');
  const before = defaultVariantIn(text, SHOP_FLAG);
  const changed = withDefaultVariant(text, { flag: SHOP_FLAG, variant });
  writeFileSync(flagFilePath, changed);
  return { flag: SHOP_FLAG, before, after: defaultVariantIn(readFileSync(flagFilePath, 'utf8'), SHOP_FLAG) };
}
