import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decideUrgency, failuresPer100, I_DO_NOT_KNOW, impactQuestionEvent, UNCONFIRMED_IMPACT } from './urgency.js';

const answer = (text: string) => ({ questionId: 'q-impact', text, suppliedAt: '2026-09-13T20:00:00Z' });

const classifyMustNotRun = async () => {
  throw new Error('classify must not run');
};

test('N rounds the failing share to whole requests in 100 and never drops below one', () => {
  assert.equal(failuresPer100(0.034), 3);
  assert.equal(failuresPer100(0.456), 46);
  assert.equal(failuresPer100(0.004), 1);
  assert.equal(failuresPer100(0), 1);
  assert.equal(failuresPer100(null), 1);
});

test('the impact question quotes N, explains why it matters and blocks nothing', () => {
  const event = impactQuestionEvent(12);
  assert.equal(event.type, 'question_asked');
  assert.equal(event.payload.text, 'Recommendations are failing on about 12 in 100 requests. Is that tolerable while I test a fix, or should I rush the safest fix first?');
  assert.equal(event.payload.questionId, 'q-impact');
  assert.equal(event.payload.blocks, 'none');
  assert.equal(event.payload.meanwhile, 'I keep gathering evidence.');
});

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
