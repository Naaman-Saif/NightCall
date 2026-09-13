import assert from 'node:assert/strict';
import { test } from 'node:test';

import { claimsFailingRequests, honestText } from './brief-check.js';
import { investigate } from './investigation.js';
import { stubInvestigation } from './investigation-stubs.test.js';

const impact = (errorShare: number | null) => ({ failure: { evidenceId: 'ev-fr', errorShare, frontendShare: errorShare, windowMinutes: 10 }, crashes: null });

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

test('no posted text promises a next step that no code performs', async () => {
  const run = stubInvestigation('We can live with it for an hour');
  await investigate(run.parts);
  const texts = run.events.map((event) => JSON.stringify(event));
  assert.equal(texts.some((text) => /next I|I go straight|I finish checking|verify the safest|verify it|still being analysed/i.test(text)), false);
});
