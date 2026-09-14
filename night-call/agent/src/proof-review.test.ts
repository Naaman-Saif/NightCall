import assert from 'node:assert/strict';
import { test } from 'node:test';

import { investigate } from './investigation.js';
import { stubInvestigation } from './investigation-stubs.test.js';

type Run = ReturnType<typeof stubInvestigation>;

const proofSteps = (run: Run) => run.steps.filter((step) => step.startsWith('proof'));
const stopSummary = (run: Run) => String(run.events.at(-1)?.payload.summary);
const lastBrief = (run: Run) => run.events.filter((event) => event.type === 'brief_updated').at(-1)?.payload as { summary: string; nextStep: string };

test('a reproduction that differs is rejected in review, so no fix is tested and nothing claims proof', async () => {
  const run = stubInvestigation("I don't know", { verdict: 'differs' });
  await investigate(run.parts);
  assert.deepEqual(proofSteps(run), ['proof contract', 'proof experiment h-1 incident_traffic flag on speed 1', 'proof job job-experiment-1 by investigator', 'proof read evidence exp-1', 'proof review exp-1 rejected']);
  assert.match(stopSummary(run), /\(not yet reproduced\)\. Reproduction rejected in review: The verdict is differs\. No fix was tested\.$/);
  assert.equal(lastBrief(run).nextStep, 'Treated as urgent. Nothing was reproduced or verified in this run.');
});

test('a reproduction the reviewer rejects, quoting a value, stops with the first reason and claims nothing further', async () => {
  const run = stubInvestigation("I don't know");
  const reason = 'Only 3 out-of-memory kills were seen, too few to match the incident.';
  run.parts.reviewer = { review: async () => ({ accepted: false, reasons: [reason, 'The 12 failed requests are also few.'] }) };
  await investigate(run.parts);
  assert.equal(proofSteps(run).at(-1), 'proof review exp-1 rejected');
  const summary = stopSummary(run);
  assert.match(summary, /\(not yet reproduced\)\. Reproduction rejected in review: Only 3 out-of-memory kills were seen, too few to match the incident\. No fix was tested\.$/);
  assert.doesNotMatch(summary, /Proposed mitigation|Verified|Pull request|Skipped|traffic recipe|Reproduced in a test copy/);
  assert.equal(lastBrief(run).nextStep, 'Treated as urgent. Nothing was reproduced or verified in this run.');
});
