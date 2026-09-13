import assert from 'node:assert/strict';
import { test } from 'node:test';

import { impactQuestionText, type FailureReading, type ImpactReadings } from './impact-facts.js';
import { requireMeasured, unmeasuredNumbers } from './measured-guard.js';
import { impactQuestionEvent } from './urgency.js';

type Shares = [service: number | null, frontend: number | null];

const ENDING = ' Is that tolerable while I test a fix, or should I rush the safest fix first?';
const failure = (shares: Shares, callsPerSecond: number | null = null): FailureReading => ({
  evidenceId: 'ev-fr', errorShare: shares[0], frontendShare: shares[1], frontendCallsPerSecond: callsPerSecond, windowMinutes: 10,
});
const crashes = (outOfMemory: number, restarts: number) => ({ evidenceId: 'ev-oom', outOfMemory, restarts, windowMinutes: 10 });
const readings = (parts: Partial<ImpactReadings>): ImpactReadings => ({ failure: null, crashes: null, ...parts });

test('a missing or unmeasured failure rate is said plainly, never as a number', () => {
  assert.equal(impactQuestionText(readings({})), `The request failure rate could not be measured yet.${ENDING}`);
  assert.equal(impactQuestionText(readings({ failure: failure([null, null]) })), `The request failure rate could not be measured yet.${ENDING}`);
});

test('requests are said not to fail only when shoppers and the service both measure 0', () => {
  assert.equal(impactQuestionText(readings({ failure: failure([0, 0]) })), `Requests are not failing right now.${ENDING}`);
  const serviceOnly = "The failure rate of shoppers' recommendation requests could not be measured while the recommendation service itself logged 0.00% errors.";
  assert.equal(impactQuestionText(readings({ failure: failure([0, null]) })), `${serviceOnly}${ENDING}`);
});

test("INC-004: shoppers' frontend share comes first, then the service, then the crashes", () => {
  const measured = readings({ failure: failure([0, 0.0271], 1.7740707887577989), crashes: crashes(4, 4) });
  const text = impactQuestionText(measured);
  const expected = "Shoppers' recommendation requests failed 2.71% of the time (frontend, 1.77 per second) while the recommendation service itself logged 0.00% errors, and the service ran out of memory and restarted 4 times in the last 10 minutes.";
  assert.equal(text, `${expected}${ENDING}`);
  assert.equal(requireMeasured(text, measured), text);
});

test('shares are shown with two decimals and never rounded up', () => {
  assert.match(impactQuestionText(readings({ failure: failure([0.02999, 0.004]) })), /failed 0\.40% of the time .* logged 2\.99% errors/);
  assert.match(impactQuestionText(readings({ failure: failure([0, 0.00004]) })), /failed less than 0\.01% of the time/);
});

test('the crash count is added only when the crashes reading exists', () => {
  assert.match(impactQuestionText(readings({ failure: failure([0, 0]), crashes: crashes(0, 0) })), /did not run out of memory or restart in the last 10 minutes/);
  assert.doesNotMatch(impactQuestionText(readings({ failure: failure([0, 0]) })), /service/);
});

test('the guard refuses any number no reading measured', () => {
  const measured = readings({ failure: failure([0.123, 0.0271], 1.77), crashes: crashes(4, 4) });
  assert.deepEqual(unmeasuredNumbers('12.30% and 2.71% at 1.77 per second, 4 crashes in 10 minutes', measured), []);
  assert.deepEqual(unmeasuredNumbers('about 12 in 100 requests', measured), ['12', '100']);
  assert.throws(() => requireMeasured('about 1 in 100 requests', readings({ failure: failure([0, 0]) })), /1, 100/);
});

test('the question event refs the evidence it quotes and blocks nothing', () => {
  const event = impactQuestionEvent(readings({ failure: failure([0.004, 0.004]), crashes: crashes(2, 2) }));
  assert.deepEqual(event.refs, ['q-impact', 'ev-fr', 'ev-oom']);
  assert.equal(event.payload.blocks, 'none');
  assert.equal(event.summary, event.payload.text);
});
