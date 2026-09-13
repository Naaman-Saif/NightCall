import type { ReaderName } from './incident-api.js';

export const NOT_REPRODUCED = 'Not yet reproduced in a test copy.';

export const READER_WORDS: Record<ReaderName, string> = {
  'failure-rate': 'failure rate', memory: 'memory', cpu: 'CPU', 'oom-events': 'crashes', logs: 'logs', traces: 'traces', 'deploy-history': 'deploy history', 'flag-state': 'live flag settings',
};

const CLAIM_CHARACTERS = 300;

export function withoutEndMark(text: string): string {
  return text.trim().replace(/[.!?]+$/, '');
}

export function causesLine(causes: { count: number; mostLikely: string | null; mostLikelyReproduced?: boolean }): string {
  const proof = causes.mostLikelyReproduced ? 'reproduced in a test copy' : 'not yet reproduced';
  if (causes.mostLikely) return `Possible causes: ${causes.count}. Most likely: ${withoutEndMark(causes.mostLikely).slice(0, CLAIM_CHARACTERS)} (${proof}).`;
  return causes.count > 0 ? `Possible causes: ${causes.count}. No cause stands out yet.` : 'No cause stands out yet.';
}
