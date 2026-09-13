import { BadRequestException } from '@nestjs/common';

import { CACHE_FLAG, FLAG_FILE } from '../production/flag-release';

export type VariantDiff = { flagText: string; from: string; to: string };

const DEFAULT_VARIANT = /("defaultVariant"\s*:\s*")([^"]*)(")/;

export function variantsIn(flagText: string): string[] {
  try {
    const file = JSON.parse(flagText) as { flags?: Record<string, { variants?: Record<string, unknown> }> };
    return Object.keys(file.flags?.[CACHE_FLAG]?.variants ?? {});
  } catch {
    return [];
  }
}

function defaultVariantLine(lines: string[]): number {
  const flagLine = lines.findIndex((line) => line.includes(`"${CACHE_FLAG}"`));
  if (flagLine === -1) return -1;
  return lines.findIndex((line, index) => index > flagLine && DEFAULT_VARIANT.test(line));
}

export function oneLineDiff(change: VariantDiff): string {
  const lines = change.flagText.split('\n');
  const index = defaultVariantLine(lines);
  if (index === -1) throw new BadRequestException({ code: 'unknown_variant' });
  const removed = lines[index].replace(DEFAULT_VARIANT, `$1${change.from}$3`);
  const added = lines[index].replace(DEFAULT_VARIANT, `$1${change.to}$3`);
  const hunk = `@@ -${index + 1} +${index + 1} @@`;
  return [`--- a/${FLAG_FILE}`, `+++ b/${FLAG_FILE}`, hunk, `-${removed}`, `+${added}`].join('\n');
}
