import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decideUrgency, I_DO_NOT_KNOW, UNCONFIRMED_IMPACT } from './urgency.js';

const answer = (text: string) => ({ questionId: 'q-impact', text, suppliedAt: '2026-09-13T20:00:00Z' });

const classifyMustNotRun = async () => {
  throw new Error('classify must not run');
};

test('no answer means urgent with the impact unconfirmed', async () => {
  const decision = await decideUrgency(null, classifyMustNotRun);
  assert.deepEqual([decision.urgency, decision.impactConfirmed], ['rush', false]);
});

test("exactly I don't know means urgent without classifying", async () => {
  const decision = await decideUrgency(answer(I_DO_NOT_KNOW), classifyMustNotRun);
  assert.deepEqual([decision.urgency, decision.impactConfirmed], ['rush', false]);
  assert.ok(UNCONFIRMED_IMPACT.includes('treating it as urgent'));
});

test('any other answer is classified and counts as confirmed impact', async () => {
  const seen: string[] = [];
  const classify = async (text: string) => {
    seen.push(text);
    return { urgency: 'tolerable' as const, reason: 'They can wait an hour.' };
  };
  const decision = await decideUrgency(answer("I don't know, maybe fine for an hour"), classify);
  assert.deepEqual(seen, ["I don't know, maybe fine for an hour"]);
  assert.deepEqual([decision.urgency, decision.impactConfirmed], ['tolerable', true]);
});
