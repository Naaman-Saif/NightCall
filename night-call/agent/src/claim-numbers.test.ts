import assert from 'node:assert/strict';
import { test } from 'node:test';

import { crashGapsSeconds, numbersIn, settleIntervals, unmatchedNumbers } from './claim-numbers.js';
import type { RecordedReading } from './evidence-ledger.js';

const crashes: RecordedReading = {
  reader: 'oom-events',
  summary: '4 out-of-memory events, 4 exits and 4 starts for recommendation in the last 10 minutes',
  excerpt: [
    '2026-09-13T18:08:11.000Z oom recommendation',
    '2026-09-13T18:08:11.000Z die recommendation exitCode=137',
    '2026-09-13T18:10:39.000Z oom recommendation',
    '2026-09-13T18:12:35.000Z oom recommendation',
    '2026-09-13T18:14:40.000Z oom recommendation',
  ].join('\n'),
};

test('numbers are read without timestamps, trace ids or product ids', () => {
  assert.deepEqual(numbersIn('2026-09-13T18:08:11.000Z die recommendation exitCode=137 trace_id=e0822765eb product L9ECAV7KIM'), ['137']);
});

test('quoted numbers match readings across formats, and unmeasured ones are reported', () => {
  const readings = ['die recommendation exitCode=137', 'peak 269 MiB, limit 500 MiB', 'errors 0.00%', 'errors 2.71%'];
  assert.deepEqual(unmatchedNumbers('OOM-killed (exitCode=137) at a 269 MiB peak against 500 MiB, 0% on the backend, 2.7% on the frontend', readings), []);
  assert.deepEqual(unmatchedNumbers('frontend shows 9.5% errors', readings), ['9.5']);
});

test('crash gaps come from the out-of-memory timestamps', () => {
  assert.deepEqual(crashGapsSeconds([crashes]), [148, 116, 125]);
});

test('an interval backed by crash timestamps is kept and not number-checked', () => {
  const kept = settleIntervals('OOM-killed every ~2 minutes.', [crashes]);
  assert.equal(kept.claim, 'OOM-killed every ~2 minutes.');
  assert.deepEqual(kept.rephrased, []);
  assert.deepEqual(unmatchedNumbers(kept.checkedText, []), []);
});

test('an interval the crash timestamps do not back is rephrased without the number', () => {
  const rephrased = settleIntervals('OOM-killed every ~10 minutes.', [crashes]);
  assert.equal(rephrased.claim, 'OOM-killed repeatedly.');
  assert.deepEqual(rephrased.rephrased, ['every ~10 minutes']);
  assert.equal(settleIntervals('Restarts about every 2 min under load.', []).claim, 'Restarts repeatedly under load.');
});
