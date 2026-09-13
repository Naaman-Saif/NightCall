import assert from 'node:assert/strict';
import { test } from 'node:test';

import { claimsFailingRequests, honestText } from './brief-check.js';
import { investigate } from './investigation.js';
import { GOOD_DRAFT, stubInvestigation } from './investigation-stubs.test.js';

const impact = (errorShare: number | null) => ({ failure: { evidenceId: 'ev-fr', errorShare, windowMinutes: 10 }, crashes: null });

test('spots sentences that claim failing requests, not ones that deny them', () => {
  assert.equal(claimsFailingRequests('Logs show failing requests around each kill.'), true);
  assert.equal(claimsFailingRequests('Shoppers see the gap while recommendations fail.'), true);
  assert.equal(claimsFailingRequests('Requests are not failing right now.'), false);
  assert.equal(claimsFailingRequests('Recommendation requests failing: 0.00% over the last 10 minutes'), false);
  assert.equal(claimsFailingRequests('Memory climbs until each kill.'), false);
});

test('with a 0 or missing failure rate the claim is replaced by the measured statement', () => {
  const text = 'Memory climbs. Logs show failing requests. Recommendations fail often.';
  assert.equal(honestText(text, impact(0)), 'Memory climbs. Requests are not failing right now.');
  assert.equal(honestText(text, impact(null)), 'Memory climbs. The request failure rate could not be measured yet.');
  assert.equal(honestText(text, null), 'Memory climbs. The request failure rate could not be measured yet.');
});

test('with measured failures the text is left alone', () => {
  const text = 'Logs show failing requests.';
  assert.equal(honestText(text, impact(0.05)), text);
});

test('a model-written brief is corrected against a 0% reading before it is posted', async () => {
  const draft = { ...GOOD_DRAFT, summary: 'Recommendations fail while memory climbs. Memory hits the limit.' };
  const run = stubInvestigation('Rush it', { errorShare: 0, draft });
  await investigate(run.parts);
  const brief = run.events.filter((event) => event.type === 'brief_updated').at(-1)?.payload as { summary: string; knownFacts: { text: string }[] };
  assert.equal(brief.summary, 'Requests are not failing right now. Memory hits the limit.');
  assert.equal(brief.knownFacts[0].text, 'Requests are not failing right now.');
  const question = run.events.find((event) => event.type === 'question_asked');
  assert.match(String(question?.payload.text), /^Requests are not failing right now, and the service ran out of memory and restarted 4 times/);
});
