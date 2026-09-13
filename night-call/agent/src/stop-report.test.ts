import assert from 'node:assert/strict';
import { test } from 'node:test';

import { newLedger, noteReading, type EvidenceLedger } from './evidence-ledger.js';
import type { ImpactReadings } from './impact-facts.js';
import { investigate } from './investigation.js';
import { stubInvestigation } from './investigation-stubs.test.js';
import { stoppedEvent, stopSummary } from './stop-report.js';

function ledgerWith(impact: ImpactReadings): EvidenceLedger {
  const ledger = newLedger();
  noteReading(ledger, { reader: 'failure-rate', reply: { evidence: { evidenceId: 'ev-fr', kind: 'logs', summary: 'rate', excerpt: '' }, data: {} } });
  noteReading(ledger, { reader: 'oom-events', reply: { evidence: { evidenceId: 'ev-oom', kind: 'oom_events', summary: 'kills', excerpt: '' }, data: {} } });
  ledger.impact = impact;
  return ledger;
}

const impact = (errorShare: number | null, crashes: [number, number] | null): ImpactReadings => ({
  failure: { evidenceId: 'ev-fr', errorShare, windowMinutes: 10 },
  crashes: crashes && { evidenceId: 'ev-oom', outOfMemory: crashes[0], restarts: crashes[1], windowMinutes: 10 },
});

const answer = (text: string) => ({ questionId: 'q-impact', text, suppliedAt: '2026-09-13T17:07:10Z' });

test('the stop summary states what was read, the answer, and that the cause step is not built', () => {
  const ledger = ledgerWith(impact(0, [2, 2]));
  const summary = stopSummary({ ledger, answer: answer('Tolerable'), reason: 'answer_recorded' });
  assert.equal(summary, 'Read failure rate (0.00% over 10 min) and crashes (2 out-of-memory restarts in 10 min). Asked about customer impact; answer: Tolerable. Did not look for the cause: that step is not built yet.');
});

test('the stop event says no next steps are available and refs the readings', () => {
  const event = stoppedEvent({ ledger: ledgerWith(impact(0.123, [2, 2])), answer: null, reason: 'no_answer' });
  assert.equal(event.type, 'investigation_stopped');
  assert.deepEqual(event.payload, { reason: 'no_answer', nextStepsAvailable: false, summary: event.summary });
  assert.deepEqual(event.refs, ['ev-fr', 'ev-oom']);
  assert.match(event.summary, /^Read failure rate \(12\.30% over 10 min\).*no answer arrived in time\./);
});

test('unmeasured and unread values are said plainly, and numbers in an answer are quoted as given', () => {
  const summary = stopSummary({ ledger: ledgerWith(impact(null, null)), answer: answer('Fine for 2 hours.'), reason: 'answer_recorded' });
  assert.match(summary, /^Read failure rate \(not measured\) and crashes \(could not be read\)\. Asked about customer impact; answer: Fine for 2 hours\. Did not/);
  assert.match(stopSummary({ ledger: ledgerWith(impact(0.00004, [3, 1])), answer: null, reason: 'no_answer' }), /less than 0\.01%.*3 out-of-memory events and 1 restarts/);
});

test('other readings are listed and an error stop says so', () => {
  const ledger = ledgerWith(impact(0, [0, 0]));
  noteReading(ledger, { reader: 'memory', reply: { evidence: { evidenceId: 'ev-mem', kind: 'memory', summary: 'mem', excerpt: '' }, data: {} } });
  assert.match(stopSummary({ ledger, answer: null, reason: 'error' }), /\. Also read memory\. Stopped after an error\. Did not look for the cause/);
});

test('every run ends with the stop event, even when a step fails', async () => {
  const answered = stubInvestigation('Tolerable');
  await investigate(answered.parts);
  assert.equal(answered.events.at(-1)?.type, 'investigation_stopped');
  const failing = stubInvestigation('Tolerable');
  const post = failing.parts.api.postEvent;
  failing.parts.api.postEvent = async (event) => (event.type === 'question_asked' ? Promise.reject(new Error('refused')) : post(event));
  await assert.rejects(investigate(failing.parts), /refused/);
  assert.equal(failing.events.at(-1)?.payload.reason, 'error');
});
