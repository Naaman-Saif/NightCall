import { readFileSync, statSync } from 'node:fs';

import { clock } from '../investigation/investigation-sentence';
import { CACHE_FLAG, flagFileAt } from './flag-release';
import { defaultVariantIn } from './flag-text';
import { excerptOf, type Reading } from './reading';

export type FlagStateQuery = { flagFilePath: string; branch: string };

type BranchComparison = { branchVariant: string | null; matchesBranch: boolean | null; comparisonError: string | null };

type LiveFlag = { variant: string; text: string };

async function branchComparison(liveText: string, branch: string): Promise<BranchComparison> {
  try {
    const { text } = await flagFileAt(branch);
    return { branchVariant: defaultVariantIn(text, CACHE_FLAG), matchesBranch: text.trim() === liveText.trim(), comparisonError: null };
  } catch (error: unknown) {
    return { branchVariant: null, matchesBranch: null, comparisonError: String(error) };
  }
}

type Comparing = { live: LiveFlag; comparison: BranchComparison; branch: string };

function comparisonText({ live, comparison, branch }: Comparing): string {
  if (comparison.matchesBranch === null) return `could not be compared with ${branch}`;
  if (comparison.matchesBranch) return `matches ${branch}`;
  return live.variant === comparison.branchVariant ? `same value as ${branch} but the file differs` : `not committed to ${branch}`;
}

export async function readFlagState(query: FlagStateQuery): Promise<Reading> {
  const text = readFileSync(query.flagFilePath, 'utf8');
  const changedAt = statSync(query.flagFilePath).mtime.toISOString();
  const live = { variant: defaultVariantIn(text, CACHE_FLAG) ?? 'missing', text };
  const comparison = await branchComparison(text, query.branch);
  const compared = comparisonText({ live, comparison, branch: query.branch });
  const summary = `${CACHE_FLAG} is ${live.variant} in the live flag file, changed at ${clock(changedAt)}, ${compared}`;
  const branchLine = `${query.branch} defaultVariant: ${comparison.branchVariant ?? 'unknown'}`;
  const lines = [`live defaultVariant: ${live.variant}`, `live file modified: ${changedAt}`, branchLine, `live file ${compared}`];
  const data = { flag: CACHE_FLAG, variant: live.variant, changedAt, ...comparison };
  const reading = { kind: 'flag_state', source: `flag file: ${CACHE_FLAG}`, summary, excerpt: excerptOf(lines), data } as const;
  return { ...reading, value: `${live.variant}, changed ${clock(changedAt)}`, observedAt: changedAt, exactSource: { kind: 'stored_excerpt' } };
}
