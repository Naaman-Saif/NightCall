import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkCauses, mostLikelyCause, type Cause } from './cause-rules.js';
import { newLedger, noteReading, type EvidenceLedger } from './evidence-ledger.js';
import type { ReaderName } from './incident-api.js';

const RATE = 'ev-logs-mu0calzo';
const CRASHES = 'ev-oom-events-mu0cam1y';
const MEMORY = 'ev-memory-mu0camkb';
const CPU = 'ev-cpu-mu0camok';
const LOGS = 'ev-logs-mu0camt8';
const TRACES = 'ev-traces-mu0can4a';
const DEPLOY = 'ev-deploy-history-mu0cansa';
const FLAG = 'ev-flag-state-mu0cao35';

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

function inc014Ledger(): EvidenceLedger {
  const ledger = newLedger();
  for (const [reader, evidenceId, summary, lines] of READINGS) {
    noteReading(ledger, { reader, reply: { evidence: { evidenceId, kind: reader, summary, excerpt: lines.join('\n') }, data: {} } });
  }
  const failure = { evidenceId: RATE, errorShare: 0, frontendShare: 0.0281, frontendCallsPerSecond: 1.7148148148148148, windowMinutes: 10 };
  ledger.impact = { failure, crashes: { evidenceId: CRASHES, outOfMemory: 5, restarts: 5, windowMinutes: 10 } };
  return ledger;
}

const FLAG_CAUSE: Cause = {
  claim: 'The recommendationCacheFailure flag, flipped to "on" at 21:22 UTC, is making the cache fail and driving repeated memory climbs into OOM kills.',
  supportingEvidenceIds: [DEPLOY, FLAG, CRASHES, MEMORY],
  contradictingEvidenceIds: [RATE, LOGS],
  confirmWith: 'Flip recommendationCacheFailure back to "off" and check whether the memory spikes and exitCode=137 restarts stop within the next 10-15 minutes.',
};

const RESTART_CAUSE: Cause = {
  claim: 'The 2.81% frontend error rate on GET /api/recommendations is caused by the repeated OOM restarts briefly dropping the backend, not by backend errors.',
  supportingEvidenceIds: [RATE, CRASHES, MEMORY],
  contradictingEvidenceIds: [TRACES],
  confirmWith: 'Compare timestamps of frontend 5xx responses with the exitCode=137 kill times.',
};

test('INC-014: a log line count and an effect that fits the cause are dropped as Against, with the reasons recorded', () => {
  const ledger = inc014Ledger();
  const { accepted, droppedCitations } = checkCauses([FLAG_CAUSE, RESTART_CAUSE], ledger);
  assert.deepEqual(droppedCitations.map((item) => [item.evidenceId, item.citedAs, item.check]), [
    [RATE, 'contradicting', 'effect_fits_cause'],
    [LOGS, 'contradicting', 'neutral_reading_cited'],
    [TRACES, 'contradicting', 'neutral_reading_cited'],
  ]);
  assert.deepEqual(accepted.map((cause) => cause.contradictingEvidenceIds), [[], []]);
  assert.equal(mostLikelyCause(accepted, ledger)?.claim, FLAG_CAUSE.claim);
});

test('an Against citation is kept only when its contradicts sentence names part of the cause mechanism', () => {
  const ledger = inc014Ledger();
  noteReading(ledger, { reader: 'flag-state', reply: { evidence: { evidenceId: 'ev-flag-off', kind: 'flag-state', summary: 'recommendationCacheFailure is off in the live flag file', excerpt: 'live defaultVariant: off' }, data: {} } });
  const contradicts = { 'ev-flag-off': 'The live flag file shows the cache flag off, so the flag cannot be driving the climbs.', [CPU]: 'CPU peaked at only 42.7%.' };
  const claim = 'The recommendationCacheFailure flag is making the cache fail and driving repeated memory climbs into OOM kills.';
  const cause = { ...FLAG_CAUSE, claim, supportingEvidenceIds: [DEPLOY, CRASHES, MEMORY], contradictingEvidenceIds: ['ev-flag-off', CPU], contradicts };
  const { accepted, dropped, droppedCitations } = checkCauses([cause], ledger);
  assert.deepEqual(dropped, []);
  assert.deepEqual(accepted[0].contradictingEvidenceIds, ['ev-flag-off']);
  assert.deepEqual(droppedCitations.map((item) => [item.evidenceId, item.check, item.value]), [[CPU, 'contradiction_not_in_mechanism', 'CPU peaked at only 42.7%.']]);
});

test('a count-only reading cited as supporting is dropped, and an Against with no sentence is dropped', () => {
  const cause = { ...FLAG_CAUSE, supportingEvidenceIds: [DEPLOY, FLAG, TRACES], contradictingEvidenceIds: [CPU] };
  const { accepted, droppedCitations } = checkCauses([cause], inc014Ledger());
  assert.deepEqual(accepted[0].supportingEvidenceIds, [DEPLOY, FLAG]);
  assert.deepEqual(droppedCitations.map((item) => [item.evidenceId, item.citedAs, item.check]), [[TRACES, 'supporting', 'neutral_reading_cited'], [CPU, 'contradicting', 'contradiction_not_named']]);
});
