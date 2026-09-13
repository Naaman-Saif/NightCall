import { CACHE_FLAG, FLAG_FILE } from '../production/flag-release';
import { withDefaultVariant } from '../production/flag-text';

export type FlagChange = { text: string; diff: string };

function changedLines(before: string[], after: string[]): number[] {
  return before.map((line, index) => (line === after[index] ? -1 : index)).filter((index) => index !== -1);
}

export function flagChangeOf(baseText: string, variant: string): FlagChange {
  const text = withDefaultVariant(baseText, { flag: CACHE_FLAG, variant });
  const before = baseText.split('\n');
  const after = text.split('\n');
  const changed = changedLines(before, after);
  if (before.length !== after.length || changed.length !== 1) {
    throw new Error(`the flag change must touch exactly one line, it touches ${changed.length}`);
  }
  const [index] = changed;
  const diff = [`--- a/${FLAG_FILE}`, `+++ b/${FLAG_FILE}`, `@@ -${index + 1} +${index + 1} @@`, `-${before[index]}`, `+${after[index]}`].join('\n');
  return { text, diff };
}
