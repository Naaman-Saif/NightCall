import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkCauses, type Cause } from './cause-rules.js';
import { newLedger, noteReading, type EvidenceLedger } from './evidence-ledger.js';
import type { ReaderName } from './incident-api.js';

const RATE = 'ev-logs-mu04x67n';
const CRASHES = 'ev-oom-events-mu04x6aq';
const MEMORY = 'ev-memory-mu04x6jt';

const READINGS: [ReaderName, string, string, string[]][] = [
  ['failure-rate', RATE, 'Recommendation requests failing: 0.00% over the last 10 minutes', [
    'recommendation oteldemo.RecommendationService/ListRecommendations: errors 0.00% of 0.8724646578395739 calls per second',
    'frontend GET /api/recommendations: errors 2.71% of 1.7740707887577989 calls per second',
    'canary /api/recommendations: 100.00% of checks healthy',
  ]],
  ['oom-events', CRASHES, '4 out-of-memory events, 4 exits and 4 starts for recommendation in the last 10 minutes', [
    '2026-09-13T18:08:11.000Z oom recommendation', '2026-09-13T18:08:11.000Z die recommendation exitCode=137',
    '2026-09-13T18:10:39.000Z oom recommendation', '2026-09-13T18:10:39.000Z die recommendation exitCode=137',
    '2026-09-13T18:12:35.000Z oom recommendation', '2026-09-13T18:12:36.000Z die recommendation exitCode=137',
    '2026-09-13T18:14:40.000Z oom recommendation', '2026-09-13T18:14:40.000Z die recommendation exitCode=137',
  ]],
  ['memory', MEMORY, 'recommendation memory latest 43 MiB, peak 269 MiB, limit 500 MiB (156 samples over 30 minutes)', [
    '2026-09-13T18:14:18.682Z 56 MiB', '2026-09-13T18:14:28.662Z 96 MiB', '2026-09-13T18:14:38.687Z 269 MiB', '2026-09-13T18:14:48.715Z 42 MiB',
  ]],
];

function inc004Ledger(): EvidenceLedger {
  const ledger = newLedger();
  for (const [reader, evidenceId, summary, lines] of READINGS) {
    noteReading(ledger, { reader, reply: { evidence: { evidenceId, kind: reader, summary, excerpt: lines.join('\n') }, data: {} } });
  }
  const failure = { evidenceId: RATE, errorShare: 0, frontendShare: 0.0271, frontendCallsPerSecond: 1.7740707887577989, windowMinutes: 10 };
  ledger.impact = { failure, crashes: { evidenceId: CRASHES, outOfMemory: 4, restarts: 4, windowMinutes: 10 } };
  return ledger;
}

const cause = (claim: string, supporting: string[]): Cause => ({ claim, supportingEvidenceIds: supporting, contradictingEvidenceIds: [], confirmWith: 'Turn the cache flag off in a test copy and watch memory.' });

test('INC-004: the memory growth then out-of-memory causes pass when their numbers are quoted from the readings', () => {
  const leak = cause('The recommendation service appears to have a memory leak: memory ramps up in a sawtooth pattern and the container is OOM-killed (exitCode=137) every ~2 minutes.', [MEMORY, CRASHES]);
  const peak = cause('Memory climbs to a 269 MiB peak against a 500 MiB limit before each out-of-memory restart.', [MEMORY, CRASHES]);
  const { accepted, dropped, rephrased } = checkCauses([leak, peak], inc004Ledger());
  assert.deepEqual(dropped, []);
  assert.deepEqual(rephrased, []);
  assert.deepEqual(accepted.map((item) => item.claim), [leak.claim, peak.claim]);
});

test('INC-004: an interval the crash times do not back is rephrased, and the cause is kept', () => {
  const { accepted, rephrased } = checkCauses([cause('Memory climbs until the container is OOM-killed (exitCode=137) every ~10 minutes.', [MEMORY, CRASHES])], inc004Ledger());
  const kept = 'Memory climbs until the container is OOM-killed (exitCode=137) repeatedly.';
  assert.deepEqual(accepted.map((item) => item.claim), [kept]);
  assert.deepEqual(rephrased, [{ claim: kept, removed: ['every ~10 minutes'] }]);
});

test('INC-004: the frontend 2.71% claim restates an effect, so it is dropped as a cause and kept as a finding', () => {
  const claim = 'Restart churn is spilling over to users: frontend GET /api/recommendations shows 2.71% errors while the backend itself reports 0.00% failures.';
  const { accepted, dropped } = checkCauses([cause(claim, [RATE, CRASHES])], inc004Ledger());
  assert.equal(accepted.length, 0);
  assert.deepEqual(dropped, [{ claim, supportingEvidenceIds: [RATE, CRASHES], check: 'effect_not_cause', value: claim.slice(0, 120) }]);
});

test('a supporting reading whose values contradict the claim makes the cause invalid', () => {
  const ledger = inc004Ledger();
  noteReading(ledger, { reader: 'failure-rate', reply: { evidence: { evidenceId: 'ev-rate-zero', kind: 'logs', summary: 'Recommendation requests failing: 0.00% over the last 10 minutes', excerpt: 'recommendation ListRecommendations: errors 0.00% of 0.8 calls per second\ncanary /api/recommendations: 100.00% of checks healthy' }, data: {} } });
  noteReading(ledger, { reader: 'oom-events', reply: { evidence: { evidenceId: 'ev-no-crashes', kind: 'oom_events', summary: '0 out-of-memory events, 0 exits and 0 starts for recommendation in the last 10 minutes', excerpt: '' }, data: {} } });
  const { dropped } = checkCauses([cause('Recommendation calls are erroring under load.', ['ev-rate-zero', MEMORY]), cause('The service keeps crashing when memory fills.', ['ev-no-crashes', MEMORY])], ledger);
  assert.deepEqual(dropped.map((item) => [item.check, item.value]), [['supporting_reading_contradicts_claim', 'ev-rate-zero'], ['supporting_reading_contradicts_claim', 'ev-no-crashes']]);
});
