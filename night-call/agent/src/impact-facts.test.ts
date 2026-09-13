import assert from 'node:assert/strict';
import { test } from 'node:test';

import { impactQuestionText, requireMeasured, unmeasuredNumbers, type ImpactReadings } from './impact-facts.js';
import { impactQuestionEvent } from './urgency.js';

const ENDING = ' Is that tolerable while I test a fix, or should I rush the safest fix first?';
const failure = (errorShare: number | null) => ({ evidenceId: 'ev-fr', errorShare, windowMinutes: 10 });
const crashes = (outOfMemory: number, restarts: number) => ({ evidenceId: 'ev-oom', outOfMemory, restarts, windowMinutes: 10 });
const readings = (parts: Partial<ImpactReadings>): ImpactReadings => ({ failure: null, crashes: null, ...parts });

test('a missing or null failure rate is said to be unmeasured, never a number', () => {
  assert.equal(impactQuestionText(readings({})), `The request failure rate could not be measured yet.${ENDING}`);
  assert.equal(impactQuestionText(readings({ failure: failure(null) })), `The request failure rate could not be measured yet.${ENDING}`);
});

test('a zero failure rate says requests are not failing', () => {
  assert.equal(impactQuestionText(readings({ failure: failure(0) })), `Requests are not failing right now.${ENDING}`);
});

test('a small share is shown with one decimal and never rounded up', () => {
  assert.equal(impactQuestionText(readings({ failure: failure(0.004) })), `0.4% of recommendation requests failed in the last 10 minutes.${ENDING}`);
  assert.match(impactQuestionText(readings({ failure: failure(0.0299) })), /^2\.9% of/);
  assert.match(impactQuestionText(readings({ failure: failure(0.0004) })), /^Less than 0\.1% of recommendation requests failed/);
});

test('the crash count is added when the crashes reading exists', () => {
  const text = impactQuestionText(readings({ failure: failure(0), crashes: crashes(4, 4) }));
  assert.equal(text, `Requests are not failing right now, and the service ran out of memory and restarted 4 times in the last 10 minutes.${ENDING}`);
  assert.match(impactQuestionText(readings({ failure: failure(0), crashes: crashes(0, 0) })), /did not run out of memory or restart in the last 10 minutes/);
  assert.doesNotMatch(impactQuestionText(readings({ failure: failure(0) })), /service/);
});

test('the guard refuses any number no reading measured', () => {
  const measured = readings({ failure: failure(0.123), crashes: crashes(4, 4) });
  assert.deepEqual(unmeasuredNumbers('12.3% failed, 4 crashes in 10 minutes', measured), []);
  assert.deepEqual(unmeasuredNumbers('about 12 in 100 requests', measured), ['12', '100']);
  assert.throws(() => requireMeasured('about 1 in 100 requests', readings({ failure: failure(0) })), /1, 100/);
});

test('the question event refs the evidence it quotes and blocks nothing', () => {
  const event = impactQuestionEvent(readings({ failure: failure(0.004), crashes: crashes(2, 2) }));
  assert.deepEqual(event.refs, ['q-impact', 'ev-fr', 'ev-oom']);
  assert.equal(event.payload.blocks, 'none');
  assert.equal(event.summary, event.payload.text);
});
