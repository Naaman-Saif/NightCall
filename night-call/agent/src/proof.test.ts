import assert from 'node:assert/strict';
import { test } from 'node:test';

import { investigate } from './investigation.js';
import { stubInvestigation } from './investigation-stubs.test.js';

type Run = ReturnType<typeof stubInvestigation>;

const proofSteps = (run: Run) => run.steps.filter((step) => step.startsWith('proof'));
const stopSummary = (run: Run) => String(run.events.at(-1)?.payload.summary);
const lastBrief = (run: Run) => run.events.filter((event) => event.type === 'brief_updated').at(-1)?.payload as { summary: string; nextStep: string };
const REPRODUCE_H1 = ['proof contract', 'proof experiment h-1 incident_traffic flag on speed 1', 'proof job job-experiment-1 by investigator', 'proof review exp-1 accepted'];
const MITIGATE_AND_VERIFY = ['proof mitigation off restart true', 'proof verification', 'proof job job-verification-1 by verifier', 'proof verification review approved'];

test('urgent: checks, reproduction with the incident traffic, review, then straight to mitigation and verification', async () => {
  const run = stubInvestigation("I don't know");
  await investigate(run.parts);
  assert.deepEqual(proofSteps(run), [...REPRODUCE_H1, ...MITIGATE_AND_VERIFY]);
  assert.ok(run.steps.indexOf('proof contract') > run.steps.indexOf('propose causes'));
  const expected = /\(reproduced in a test copy\)\. Reproduced in a test copy: the failure matched every recorded check and the review accepted it\. Proposed mitigation: set the recommendationCacheFailure flag to off and restart the service\. Verified: all three rounds passed the recorded checks and the review approved it\.$/;
  assert.match(stopSummary(run), expected);
  assert.equal(lastBrief(run).nextStep, 'Treated as urgent. The mitigation is verified; no pull request is open yet.');
  assert.equal(run.events.at(-1)?.type, 'investigation_stopped');
});

test('tolerable with time left: one extra experiment on the next cause before mitigation', async () => {
  const run = stubInvestigation('Tolerable');
  await investigate(run.parts);
  const extra = ['proof experiment h-2 incident_traffic flag on speed 1', 'proof job job-experiment-2 by investigator', 'proof review exp-2 accepted'];
  assert.deepEqual(proofSteps(run), [...REPRODUCE_H1, ...extra, ...MITIGATE_AND_VERIFY]);
});

test('tolerable but an experiment would pass minute 12: the extra experiment is skipped and recorded', async () => {
  const run = stubInvestigation('Tolerable');
  run.parts.run = { skipped: [], fallbacks: [], openedAt: 0, deadline: 60 * 60_000, now: () => 7 * 60_000 };
  await investigate(run.parts);
  assert.deepEqual(proofSteps(run), [...REPRODUCE_H1, ...MITIGATE_AND_VERIFY]);
  assert.match(stopSummary(run), /Skipped: testing the next possible cause \(not enough time before minute 12\)\.$/);
});

test('a missing traffic recipe falls back to fixed traffic once and says so', async () => {
  const run = stubInvestigation("I don't know", { recipeMissing: true });
  await investigate(run.parts);
  assert.deepEqual(proofSteps(run).slice(1, 3), ['proof experiment h-1 incident_traffic flag on speed 1', 'proof experiment h-1 fixed_fallback flag on speed 1']);
  assert.match(stopSummary(run), /accepted it\. The incident's traffic recipe was missing, so the test copy used fixed fallback traffic\. Proposed/);
});

test('a reproduction that differs is rejected, so no mitigation is proposed and nothing claims proof', async () => {
  const run = stubInvestigation("I don't know", { verdict: 'differs' });
  await investigate(run.parts);
  assert.deepEqual(proofSteps(run), ['proof contract', 'proof experiment h-1 incident_traffic flag on speed 1', 'proof job job-experiment-1 by investigator', 'proof review exp-1 rejected']);
  assert.match(stopSummary(run), /\(not yet reproduced\)\. Not reproduced in a test copy: the experiment did not match the recorded checks\. Skipped: proposing the mitigation \(no reproduction was accepted\)\.$/);
  assert.equal(lastBrief(run).nextStep, 'Treated as urgent. Nothing was reproduced or verified in this run.');
});

test('failed verification rounds are rejected by the review and reported as not verified', async () => {
  const run = stubInvestigation("I don't know", { verificationVerdict: 'differs' });
  await investigate(run.parts);
  assert.equal(proofSteps(run).at(-1), 'proof verification review rejected');
  assert.match(stopSummary(run), /Not verified: the three rounds did not all pass the recorded checks\.$/);
  assert.equal(lastBrief(run).nextStep, 'Treated as urgent. The failure was reproduced, but no mitigation was verified in this run.');
});

test('when the proof routes are not on the server yet, one skip is recorded and nothing claims proof', async () => {
  const run = stubInvestigation("I don't know", { proof: 'unavailable' });
  await investigate(run.parts);
  assert.deepEqual(proofSteps(run), ['proof contract']);
  assert.match(stopSummary(run), /Not yet reproduced in a test copy\. Skipped: recording the symptom checks \(not available on this server yet\)\.$/);
  assert.equal(lastBrief(run).nextStep, 'Treated as urgent. Nothing was reproduced or verified in this run.');
});
