import assert from 'node:assert/strict';
import { test } from 'node:test';

import { causeProblem, checkCauses, mostLikelyCause, type Cause } from './cause-rules.js';
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

test('a cause citing evidence that does not exist, or no support, is dropped', () => {
  const ledger = ledgerWithReadings();
  assert.match(causeProblem(cause({ supportingEvidenceIds: ['ev-made-up'] }), ledger) ?? '', /does not exist: ev-made-up/);
  assert.match(causeProblem(cause({ contradictingEvidenceIds: ['ev-other'] }), ledger) ?? '', /does not exist: ev-other/);
  assert.equal(causeProblem(cause({ supportingEvidenceIds: [] }), ledger), 'cites no supporting evidence');
});

test('every number in a claim must appear in a reading the cause cites', () => {
  const ledger = ledgerWithReadings();
  assert.equal(causeProblem(cause({}), ledger), null);
  assert.match(causeProblem(cause({ claim: 'Memory reaches 900 MiB.' }), ledger) ?? '', /no cited reading contains: 900/);
  assert.match(causeProblem(cause({ claim: 'CPU sits at 20.1%.', supportingEvidenceIds: ['ev-memory'] }), ledger) ?? '', /contains: 20\.1/);
});

test('failing requests against a 0% reading, or a claim of proof, are dropped', () => {
  const ledger = ledgerWithReadings();
  assert.match(causeProblem(cause({ claim: 'Recommendation requests fail when memory runs out.' }), ledger) ?? '', /failure-rate reading shows none/);
  assert.match(causeProblem(cause({ claim: 'Memory growth is proven to cause the restarts.' }), ledger) ?? '', /proven/);
});

test('checkCauses numbers the valid causes and says why the others were dropped', () => {
  const { accepted, dropped } = checkCauses([cause({ claim: 'Memory reaches 900 MiB.' }), cause({}), cause({ claim: 'Logs show an OutOfMemoryError.', supportingEvidenceIds: ['ev-logs'] })], ledgerWithReadings());
  assert.deepEqual(accepted.map((item) => item.hypothesisId), ['h-1', 'h-2']);
  assert.deepEqual(dropped.map((item) => item.problem), ['quotes numbers that no cited reading contains: 900']);
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
