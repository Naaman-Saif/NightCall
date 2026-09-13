import assert from 'node:assert/strict';
import { test } from 'node:test';

import { newLedger, noteReading, type EvidenceLedger } from './evidence-ledger.js';
import type { ImpactReadings } from './impact-facts.js';
import type { ReaderName } from './incident-api.js';
import { stoppedEvent, stopSummary, type StopFacts } from './stop-report.js';

function ledgerWith(impact: ImpactReadings, readers: ReaderName[] = ['failure-rate', 'oom-events']): EvidenceLedger {
  const ledger = newLedger();
  readers.forEach((reader) => noteReading(ledger, { reader, reply: { evidence: { evidenceId: `ev-${reader}`, kind: reader, summary: reader, excerpt: '' }, data: {} } }));
  ledger.impact = impact;
  return ledger;
}

const impact = (errorShare: number | null, crashes: [number, number] | null): ImpactReadings => ({
  failure: { evidenceId: 'ev-failure-rate', errorShare, windowMinutes: 10 },
  crashes: crashes && { evidenceId: 'ev-oom-events', outOfMemory: crashes[0], restarts: crashes[1], windowMinutes: 10 },
});

const answer = (text: string) => ({ questionId: 'q-impact', text, suppliedAt: '2026-09-13T17:07:10Z' });

const facts = (overrides: Partial<StopFacts>): StopFacts => ({
  ledger: ledgerWith(impact(0, [2, 2])), answer: answer('Tolerable'), reason: 'answer_recorded', asked: true, causes: 0, mostLikely: null, skipped: [], ...overrides,
});

test('with no causes the summary says what was read, the answer, and that no cause stands out', () => {
  assert.equal(stopSummary(facts({})), 'Read failure rate (0.00% over 10 min) and crashes (2 out-of-memory restarts in 10 min). Asked about customer impact; answer: Tolerable. No cause stands out yet.');
});

test('with causes the summary names the most likely one, other readings and skipped steps', () => {
  const ledger = ledgerWith(impact(0.123, [2, 2]), ['failure-rate', 'oom-events', 'memory', 'deploy-history']);
  const summary = stopSummary(facts({ ledger, answer: null, reason: 'no_answer', causes: 2, mostLikely: 'Memory reaches the limit.', skipped: ['reading logs (NightCall refused the call)'] }));
  const expected = 'Read failure rate (12.30% over 10 min) and crashes (2 out-of-memory restarts in 10 min). Also read memory, deploy history. Asked about customer impact; no answer arrived in time. Possible causes: 2. Most likely: Memory reaches the limit (not yet reproduced). Skipped: reading logs (NightCall refused the call).';
  assert.equal(summary, expected);
  assert.match(stopSummary(facts({ causes: 2 })), /Possible causes: 2\. No cause stands out yet\.$/);
});

test('the stop event says no next steps are available, repeats the summary and refs the readings', () => {
  const event = stoppedEvent(facts({ reason: 'no_answer', answer: null }));
  assert.equal(event.type, 'investigation_stopped');
  assert.deepEqual(event.payload, { reason: 'no_answer', nextStepsAvailable: false, summary: event.summary });
  assert.deepEqual(event.refs, ['ev-failure-rate', 'ev-oom-events']);
  assert.ok(stopSummary(facts({ mostLikely: 'x'.repeat(5000), causes: 1, skipped: ['y'.repeat(3000)] })).length <= 2000);
});

test('unmeasured and unread values are said plainly, and numbers in an answer are quoted as given', () => {
  const summary = stopSummary(facts({ ledger: ledgerWith(impact(null, null)), answer: answer('Fine for 2 hours.') }));
  assert.match(summary, /^Read failure rate \(not measured\) and crashes \(could not be read\)\. Asked about customer impact; answer: Fine for 2 hours\. No cause/);
  assert.match(stopSummary(facts({ ledger: ledgerWith(impact(0.00004, [3, 1])) })), /less than 0\.01%.*3 out-of-memory events and 1 restarts/);
});

test('a run that never asked, or stopped on an error, says so', () => {
  assert.match(stopSummary(facts({ asked: false, answer: null, reason: 'no_answer' })), /Did not ask about customer impact\./);
  assert.match(stopSummary(facts({ reason: 'error' })), /Stopped after an error\. No cause stands out yet\.$/);
});
