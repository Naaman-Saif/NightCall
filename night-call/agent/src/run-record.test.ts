import assert from 'node:assert/strict';
import { test } from 'node:test';

import { investigate } from './investigation.js';
import { stubInvestigation } from './investigation-stubs.test.js';

test('steps that used the fallback model are named in the stop summary', async () => {
  const run = stubInvestigation('Tolerable', { fallbackOn: ['causes', 'classify'] });
  await investigate(run.parts);
  const stop = run.events.at(-1);
  assert.equal(stop?.type, 'investigation_stopped');
  assert.match(String(stop?.payload.summary), /Used the fallback model for: comparing possible causes; reading the answer\.$/);
});

test('a cause that only restates a measured effect becomes a finding in the report', async () => {
  const effect = { claim: 'Shoppers see 12.30% errors on recommendations.', supportingEvidenceIds: ['ev-failure-rate-1'], contradictingEvidenceIds: [], confirmWith: 'Compare frontend and service error shares.' };
  const run = stubInvestigation('Tolerable', { causes: [effect] });
  await investigate(run.parts);
  assert.equal(run.events.some((event) => event.type === 'hypothesis_proposed'), false);
  const brief = run.events.filter((event) => event.type === 'brief_updated').at(-1)?.payload as { knownFacts: unknown[] };
  assert.deepEqual(brief.knownFacts.at(-1), { text: effect.claim, evidenceIds: ['ev-failure-rate-1'] });
});

test('a run without fallback or skipped steps says neither', async () => {
  const run = stubInvestigation('Tolerable');
  await investigate(run.parts);
  const summary = String(run.events.at(-1)?.payload.summary);
  assert.equal(/fallback|Skipped/.test(summary), false);
});
