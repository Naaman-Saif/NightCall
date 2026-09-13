import type { PayloadOf } from '../investigation/payload-schemas';

export type Reading = {
  kind: PayloadOf<'evidence_recorded'>['kind'];
  source: string;
  summary: string;
  excerpt: string;
  data: unknown;
};

const EXCERPT_CHARACTERS = 4000;

export function excerptOf(lines: string[]): string {
  return lines.join('\n').slice(-EXCERPT_CHARACTERS);
}

export function momentMinutesAgo(minutes: number): number {
  return Date.now() - minutes * 60_000;
}
