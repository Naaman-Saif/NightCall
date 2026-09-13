import type { PayloadOf } from '../investigation/payload-schemas';
import type { CrashCounts } from '../investigation/snapshot';
import type { ExactSource } from './exact-source';
import type { SourceLink } from './source-links';

export type Reading = {
  kind: PayloadOf<'evidence_recorded'>['kind'];
  source: string;
  summary: string;
  excerpt: string;
  data: unknown;
  sourceLinks?: SourceLink[];
  exactSource?: ExactSource;
  crashCounts?: CrashCounts;
  value?: string;
  observedAt?: string;
};

const EXCERPT_CHARACTERS = 4000;

export function excerptOf(lines: string[]): string {
  return lines.join('\n').slice(-EXCERPT_CHARACTERS);
}

export function excerptFromStart(lines: string[]): string {
  return lines.join('\n').slice(0, EXCERPT_CHARACTERS);
}

export function momentMinutesAgo(minutes: number): number {
  return Date.now() - minutes * 60_000;
}
