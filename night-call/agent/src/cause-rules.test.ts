import assert from 'node:assert/strict';
import { test } from 'node:test';

import { causeFailure, checkCauses, mostLikelyCause, type Cause } from './cause-rules.js';
import { newLedger, noteReading, type EvidenceLedger } from './evidence-ledger.js';
import type { ReaderName } from './incident-api.js';

function ledgerWithReadings(): EvidenceLedger {
  const ledger = newLedger();
  const note = (reader: ReaderName, summary: string) =>
    noteReading(ledger, { reader, reply: { evidence: { evidenceId: `ev-${reader}`, kind: reader, summary, excerpt: '' }, data: {} } });
  note('memory', 'recommendation memory latest 480 MiB, peak 500 MiB, limit 500 MiB');
  note('oom-events', '4 out-of-memory events, 4 exits and 4 starts');
  note('logs', 'OutOfMemoryError in the cache');
  note('cpu', 'cpu latest 20.1%');
  ledger.impact = { failure: { evidenceId: 'ev-failure', errorShare: 0, windowMinutes: 10 }, crashes: null };
  return ledger;
}

const cause = (overrides: Partial<Cause>): Cause => ({
  claim: 'Memory reaches the 500 MiB limit before each restart.',
  supportingEvidenceIds: ['ev-memory', 'ev-oom-events'],
  contradictingEvidenceIds: [],
  confirmWith: 'Watch memory with the cache flag off.',
  ...overrides,
});

const failureOf = (proposed: Cause, ledger: EvidenceLedger) => causeFailure({ cause: proposed, checkedText: proposed.claim }, ledger);

test('evidence that does not exist, no support, or evidence cited both ways fails with the exact value', () => {
  const ledger = ledgerWithReadings();
  assert.deepEqual(failureOf(cause({ supportingEvidenceIds: ['ev-made-up'] }), ledger), { check: 'evidence_not_found', value: 'ev-made-up' });
  assert.deepEqual(failureOf(cause({ supportingEvidenceIds: [] }), ledger), { check: 'no_supporting_evidence', value: 'none cited' });
  assert.deepEqual(failureOf(cause({ contradictingEvidenceIds: ['ev-memory'] }), ledger), { check: 'cited_as_supporting_and_contradicting', value: 'ev-memory' });
});

test('claims or confirm steps the server would refuse fail with their length', () => {
  const ledger = ledgerWithReadings();
  assert.deepEqual(failureOf(cause({ claim: `Memory grows ${'a'.repeat(160)}` }), ledger), { check: 'claim_too_long', value: '173 characters' });
  assert.deepEqual(failureOf(cause({ confirmWith: 'b'.repeat(201) }), ledger), { check: 'confirm_step_too_long', value: '201 characters' });
});

test('numbers, failing requests against a 0% rate, and proof wording fail with the offending value', () => {
  const ledger = ledgerWithReadings();
  assert.equal(failureOf(cause({}), ledger), null);
  assert.deepEqual(failureOf(cause({ claim: 'Memory reaches 900 MiB.' }), ledger), { check: 'number_not_in_cited_readings', value: '900' });
  assert.equal(failureOf(cause({ claim: 'Recommendation requests fail when memory runs out.' }), ledger)?.check, 'failing_requests_against_zero_rate');
  assert.match(failureOf(cause({ claim: 'Memory growth is proven to cause the restarts.' }), ledger)?.value ?? '', /proven/);
});

test('checkCauses merges repeated ids, numbers the kept causes and records every drop', () => {
  const proposed = [cause({ claim: 'Memory reaches 900 MiB.' }), cause({ supportingEvidenceIds: ['ev-memory', 'ev-memory', 'ev-oom-events'] })];
  const { accepted, dropped } = checkCauses(proposed, ledgerWithReadings());
  assert.deepEqual(accepted.map((item) => [item.hypothesisId, item.supportingEvidenceIds]), [['h-1', ['ev-memory', 'ev-oom-events']]]);
  assert.deepEqual(dropped, [{ claim: 'Memory reaches 900 MiB.', supportingEvidenceIds: ['ev-memory', 'ev-oom-events'], check: 'number_not_in_cited_readings', value: '900' }]);
});

test('supported needs two independent readings and no contradicting reading', () => {
  const ledger = ledgerWithReadings();
  const strong = { ...cause({}), hypothesisId: 'h-1' };
  assert.equal(mostLikelyCause([strong], ledger)?.hypothesisId, 'h-1');
  assert.equal(mostLikelyCause([{ ...strong, supportingEvidenceIds: ['ev-memory', 'ev-memory'] }], ledger), null);
  assert.equal(mostLikelyCause([{ ...strong, contradictingEvidenceIds: ['ev-cpu'] }], ledger), null);
});

test('a tie at the top means no cause stands out, and more independent support wins', () => {
  const ledger = ledgerWithReadings();
  const first = { ...cause({}), hypothesisId: 'h-1' };
  const second = { ...cause({ supportingEvidenceIds: ['ev-logs', 'ev-cpu'] }), hypothesisId: 'h-2' };
  assert.equal(mostLikelyCause([first, second], ledger), null);
  const third = { ...cause({ supportingEvidenceIds: ['ev-logs', 'ev-cpu', 'ev-memory'] }), hypothesisId: 'h-3' };
  assert.equal(mostLikelyCause([first, third], ledger)?.hypothesisId, 'h-3');
});
