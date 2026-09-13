import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkCauses, mostLikelyCause } from './cause-rules.js';
import { addFlagOffReading, CPU, DEPLOY, FLAG, FLAG_CAUSE, FLAG_OFF, FLAG_OFF_CAUSE, inc014Ledger, LEAK_CAUSE, LOGS, RATE, RESTART_CAUSE, TRACES } from './inc014-fixture.test.js';

test('INC-014: a log line count and an effect that fits the cause are dropped as Against, with the reasons recorded', () => {
  const ledger = inc014Ledger();
  const { accepted, droppedCitations } = checkCauses([FLAG_CAUSE, LEAK_CAUSE, RESTART_CAUSE], ledger);
  assert.deepEqual(droppedCitations.map((item) => [item.evidenceId, item.citedAs, item.check]), [
    [RATE, 'contradicting', 'effect_fits_cause'],
    [LOGS, 'contradicting', 'neutral_reading_cited'],
    [TRACES, 'contradicting', 'neutral_reading_cited'],
  ]);
  assert.deepEqual(accepted.map((cause) => cause.contradictingEvidenceIds), [[], [], []]);
  assert.equal(mostLikelyCause(accepted, ledger)?.claim, FLAG_CAUSE.claim);
});

test('an Against citation is kept only when its contradicts sentence names part of the cause mechanism', () => {
  const ledger = inc014Ledger();
  addFlagOffReading(ledger);
  const cause = { ...FLAG_OFF_CAUSE, contradictingEvidenceIds: [FLAG_OFF, CPU], contradicts: { ...FLAG_OFF_CAUSE.contradicts, [CPU]: 'CPU peaked at only 42.7%.' } };
  const { accepted, dropped, droppedCitations } = checkCauses([cause], ledger);
  assert.deepEqual(dropped, []);
  assert.deepEqual(accepted[0].contradictingEvidenceIds, [FLAG_OFF]);
  assert.deepEqual(droppedCitations.map((item) => [item.evidenceId, item.check, item.value]), [[CPU, 'contradiction_not_in_mechanism', 'CPU peaked at only 42.7%.']]);
});

test('a count-only reading cited as supporting is dropped, and an Against with no sentence is dropped', () => {
  const cause = { ...FLAG_CAUSE, supportingEvidenceIds: [DEPLOY, FLAG, TRACES], contradictingEvidenceIds: [CPU] };
  const { accepted, droppedCitations } = checkCauses([cause], inc014Ledger());
  assert.deepEqual(accepted[0].supportingEvidenceIds, [DEPLOY, FLAG]);
  assert.deepEqual(droppedCitations.map((item) => [item.evidenceId, item.citedAs, item.check]), [[TRACES, 'supporting', 'neutral_reading_cited'], [CPU, 'contradicting', 'contradiction_not_named']]);
});
