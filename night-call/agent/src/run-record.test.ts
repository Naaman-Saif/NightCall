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

test('an older server without the flag settings route is skipped and recorded, and the run goes on', async () => {
  const run = stubInvestigation('Tolerable', { failingReaders: ['flag-state'] });
  await investigate(run.parts);
  assert.ok(run.steps.includes('propose causes'));
  assert.match(String(run.events.at(-1)?.payload.summary), /Skipped: reading the live flag settings \(not available on this server yet\)\.$/);
});

test('a cause can cite the live flag settings, including the time the flag changed', async () => {
  const flagCause = { claim: 'The cache flag was switched on at 17:54 and not committed, so the cache grows until memory reaches the 500 MiB limit.', supportingEvidenceIds: ['ev-flag-state-1', 'ev-memory-1'], contradictingEvidenceIds: [], confirmWith: 'Turn the flag off in a test copy and watch memory.' };
  const run = stubInvestigation('Tolerable', { causes: [flagCause] });
  await investigate(run.parts);
  const proposed = run.events.filter((event) => event.type === 'hypothesis_proposed');
  assert.deepEqual(proposed.map((event) => event.payload.supportingEvidenceIds), [['ev-flag-state-1', 'ev-memory-1']]);
  assert.match(String(run.events.at(-1)?.payload.summary), /Also read memory, CPU, logs, traces, deploy history, live flag settings\./);
});

test('a run without fallback or skipped steps says neither', async () => {
  const run = stubInvestigation('Tolerable');
  await investigate(run.parts);
  const summary = String(run.events.at(-1)?.payload.summary);
  assert.equal(/fallback|Skipped/.test(summary), false);
});
