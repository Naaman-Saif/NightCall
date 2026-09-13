import type { Cause } from './cause-rules.js';
import { newLedger, noteReading, type EvidenceLedger } from './evidence-ledger.js';
import type { ReaderName } from './incident-api.js';

export const RATE = 'ev-logs-mu0calzo';
export const CRASHES = 'ev-oom-events-mu0cam1y';
export const MEMORY = 'ev-memory-mu0camkb';
export const CPU = 'ev-cpu-mu0camok';
export const LOGS = 'ev-logs-mu0camt8';
export const TRACES = 'ev-traces-mu0can4a';
export const DEPLOY = 'ev-deploy-history-mu0cansa';
export const FLAG = 'ev-flag-state-mu0cao35';
export const FLAG_OFF = 'ev-flag-off';
export const FLAG_OFF_SENTENCE = 'The live flag file shows the cache flag off, so the flag cannot be driving the climbs.';

const crashLines = ['21:32:20', '21:34:26', '21:36:49', '21:38:36', '21:40:53'].flatMap((time) => [`2026-09-13T${time}.000Z oom recommendation`, `2026-09-13T${time}.000Z die recommendation exitCode=137`, `2026-09-13T${time}.000Z start recommendation`]);

const READINGS: [ReaderName, string, string, string[]][] = [
  ['failure-rate', RATE, 'Recommendation requests failing: frontend GET /api/recommendations 2.81% of 1.71 requests per second, backend ListRecommendations 0.00%, over the last 10 minutes', [
    'recommendation oteldemo.RecommendationService/ListRecommendations: errors 0.00% of 0.8911235804365579 calls per second',
    'frontend GET /api/recommendations: errors 2.81% of 1.7148148148148148 calls per second',
    'canary /api/recommendations: 100.00% of checks healthy',
  ]],
  ['oom-events', CRASHES, '5 out-of-memory events, 5 exits and 5 starts for recommendation in the last 10 minutes', crashLines],
  ['memory', MEMORY, 'recommendation memory latest 49 MiB, peak 241 MiB, limit 500 MiB (125 samples over 30 minutes)', ['2026-09-13T21:21:28.129Z 42 MiB', '2026-09-13T21:22:58.097Z 109 MiB', '2026-09-13T21:40:48.000Z 241 MiB']],
  ['cpu', CPU, 'recommendation cpu latest 4.9%, peak 42.7% (125 samples over 30 minutes)', ['2026-09-13T21:22:58.097Z 17.2%']],
  ['logs', LOGS, '200 log lines from recommendation in the last 30 minutes', ['2026-09-13T21:42:06.445Z INFO [recommendation_server.py:47] - Receive ListRecommendations for product ids:[\'L9ECAV7KIM\']']],
  ['traces', TRACES, '0 error spans in 0 traces from recommendation in the last 30 minutes', []],
  ['deploy-history', DEPLOY, 'Flag file changed in afa6f51: release: enable recommendation cache', ['afa6f51 2026-09-13T21:22:00Z Naaman Saif: release: enable recommendation cache', '-      "defaultVariant": "off",', '+      "defaultVariant": "on",']],
  ['flag-state', FLAG, 'recommendationCacheFailure is on in the live flag file, changed at 21:22 UTC, matches nightcall-demo', ['live defaultVariant: on', 'live file modified: 2026-09-13T21:22:01.091Z']],
];

export function inc014Ledger(): EvidenceLedger {
  const ledger = newLedger();
  for (const [reader, evidenceId, summary, lines] of READINGS) {
    noteReading(ledger, { reader, reply: { evidence: { evidenceId, kind: reader, summary, excerpt: lines.join('\n') }, data: {} } });
  }
  const failure = { evidenceId: RATE, errorShare: 0, frontendShare: 0.0281, frontendCallsPerSecond: 1.7148148148148148, windowMinutes: 10 };
  ledger.impact = { failure, crashes: { evidenceId: CRASHES, outOfMemory: 5, restarts: 5, windowMinutes: 10 } };
  return ledger;
}

export function addFlagOffReading(ledger: EvidenceLedger): void {
  noteReading(ledger, { reader: 'flag-state', reply: { evidence: { evidenceId: FLAG_OFF, kind: 'flag-state', summary: 'recommendationCacheFailure is off in the live flag file', excerpt: 'live defaultVariant: off' }, data: {} } });
}

export const FLAG_CAUSE: Cause = {
  claim: 'The recommendationCacheFailure flag, flipped to "on" at 21:22 UTC, is making the cache fail and driving repeated memory climbs into OOM kills.',
  supportingEvidenceIds: [DEPLOY, FLAG, CRASHES, MEMORY],
  contradictingEvidenceIds: [RATE, LOGS],
  confirmWith: 'Flip recommendationCacheFailure back to "off" and check whether the memory spikes and exitCode=137 restarts stop within the next 10-15 minutes.',
};

export const LEAK_CAUSE: Cause = {
  claim: 'The service has a memory leak or runaway allocation that grows from a 42 MiB baseline until the process is OOM-killed, restarting every ~2 minutes.',
  supportingEvidenceIds: [CRASHES, MEMORY],
  contradictingEvidenceIds: [],
  confirmWith: 'Take a heap dump or profile of a running replica during one climb window to see what is allocating the memory.',
};

export const RESTART_CAUSE: Cause = {
  claim: 'The 2.81% frontend error rate on GET /api/recommendations is caused by the repeated OOM restarts briefly dropping the backend, not by backend errors.',
  supportingEvidenceIds: [RATE, CRASHES, MEMORY],
  contradictingEvidenceIds: [TRACES],
  confirmWith: 'Compare timestamps of frontend 5xx responses with the exitCode=137 kill times.',
};

export const FLAG_OFF_CAUSE: Cause = {
  claim: 'The recommendationCacheFailure flag is making the cache fail and driving repeated memory climbs into OOM kills.',
  supportingEvidenceIds: [DEPLOY, CRASHES, MEMORY],
  contradictingEvidenceIds: [FLAG_OFF],
  contradicts: { [FLAG_OFF]: FLAG_OFF_SENTENCE },
  confirmWith: FLAG_CAUSE.confirmWith,
};
