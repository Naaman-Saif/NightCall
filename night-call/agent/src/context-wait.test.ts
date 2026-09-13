import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ANSWER_WAIT_MS, waitForImpactAnswer, type Clock } from './context-wait.js';
import { answersOf, type Answer, type IncidentApi } from './incident-api.js';
import { ToolAnswerError } from './tool-client.js';

function fakeClock(): Clock & { elapsed: () => number } {
  let now = 0;
  return { now: () => now, pause: async (milliseconds) => (now += milliseconds), elapsed: () => now };
}

function answeringApi(clock: ReturnType<typeof fakeClock>, replies: Answer[][]): IncidentApi & { waits: number[] } {
  const waits: number[] = [];
  const waitForAnswers = async (waitSeconds: number) => {
    waits.push(waitSeconds);
    await clock.pause(waitSeconds * 1000);
    return replies.shift() ?? [];
  };
  const unused = async () => {
    throw new Error('not used');
  };
  return { waits, waitForAnswers, read: unused, postEvent: unused, readCase: unused };
}

const impact = (text: string): Answer => ({ questionId: 'q-impact', text, suppliedAt: '2026-09-13T20:00:00Z' });

test('long-polls in 60 second steps until the q-impact answer arrives, ignoring other questions', async () => {
  const clock = fakeClock();
  const api = answeringApi(clock, [[], [{ ...impact('other'), questionId: 'q-other' }], [impact('Rush it')]]);
  const answer = await waitForImpactAnswer(api, clock);
  assert.equal(answer?.text, 'Rush it');
  assert.deepEqual(api.waits, [60, 60, 60]);
});

test('gives up with no answer after 8 minutes', async () => {
  const clock = fakeClock();
  const api = answeringApi(clock, []);
  assert.equal(await waitForImpactAnswer(api, clock), null);
  assert.equal(clock.elapsed(), ANSWER_WAIT_MS);
  assert.equal(api.waits.length, 8);
});

test('a missing context route fails loudly instead of spinning', async () => {
  const clock = fakeClock();
  const api = answeringApi(clock, []);
  api.waitForAnswers = async () => {
    throw new ToolAnswerError(404);
  };
  await assert.rejects(waitForImpactAnswer(api, clock), /404/);
});

test('reads answers from an answers list, a context list or a bare list', () => {
  const item = impact('fine');
  assert.deepEqual(answersOf({ answers: [item] }), [item]);
  assert.deepEqual(answersOf({ context: [item], minutesLeft: 20 }), [item]);
  assert.deepEqual(answersOf([item, { nothing: true }]), [item]);
  assert.deepEqual(answersOf(null), []);
});
