import assert from 'node:assert/strict';
import { test } from 'node:test';

import { investigate } from './investigation.js';
import { stubInvestigation } from './investigation-stubs.test.js';
import { UNCONFIRMED_IMPACT } from './urgency.js';

type BriefPayload = { summary: string; knownFacts: unknown[]; unknowns: string[]; nextStep: string };
type Run = ReturnType<typeof stubInvestigation>;

const eventsOf = (run: Run, type: string) => run.events.filter((event) => event.type === type);
const lastPayload = (run: Run, type: string) => eventsOf(run, type).at(-1)?.payload ?? {};
const NOW_STEPS = ['Reading the failure rate and crashes', 'Asking about customer impact', 'Reading memory before each crash', 'Reading deploy history', 'Comparing possible causes', 'Writing the report'];

test('an early answer never cuts the investigation short', async () => {
  const run = stubInvestigation('Rush it');
  await investigate(run.parts);
  const reads = run.steps.filter((step) => step.startsWith('read '));
  assert.deepEqual(reads, ['read failure-rate', 'read oom-events', 'read memory', 'read cpu', 'read logs', 'read traces', 'read deploy-history', 'read flag-state']);
  assert.ok(run.steps.indexOf('wait for answer') < run.steps.indexOf('read memory'));
  assert.ok(run.steps.indexOf('propose causes') > run.steps.indexOf('read flag-state'));
  assert.equal(run.steps.indexOf('now: Reading the live flag settings') + 1, run.steps.indexOf('read flag-state'));
  assert.deepEqual(run.events.slice(-3).map((event) => event.type), ['brief_updated', 'role_status_changed', 'investigation_stopped']);
});

test('the Now line names each step just before it runs', async () => {
  const run = stubInvestigation(null);
  await investigate(run.parts);
  NOW_STEPS.forEach((text) => assert.ok(run.steps.includes(`now: ${text}`), text));
  assert.equal(run.steps.indexOf('now: Reading memory before each crash') + 1, run.steps.indexOf('read memory'));
});

test('checked causes are posted and the independently supported one is marked supported', async () => {
  const run = stubInvestigation('Tolerable');
  await investigate(run.parts);
  assert.deepEqual(eventsOf(run, 'hypothesis_proposed').map((event) => event.payload.hypothesisId), ['h-1', 'h-2']);
  const supported = eventsOf(run, 'hypothesis_status_changed').filter((event) => event.payload.status === 'supported');
  assert.deepEqual(supported.map((event) => [event.payload.hypothesisId, event.payload.status]), [['h-1', 'supported']]);
  assert.match(String(supported[0].payload.reason), /independent readings of memory, crashes, deploy history/);
  const brief = lastPayload(run, 'brief_updated') as BriefPayload;
  assert.match(brief.summary, /Possible causes: 2\. Most likely: The recommendation cache grows until memory reaches the 500 MiB limit and the service runs out of memory \(reproduced in a test copy\)\. Reproduced in a test copy: the failure matched every recorded check and the review accepted it\./);
  assert.match(brief.unknowns[0], /^Most likely possible cause: .* Supported by ev-memory-1, ev-oom-events-1, ev-deploy-history-1\. Would be confirmed by:/);
  assert.match(String(lastPayload(run, 'investigation_stopped').summary), /Possible causes: 2\. Most likely: The recommendation cache grows/);
});

test('a failed reader and a failed cause step are skipped and recorded, and the run still reports', async () => {
  const run = stubInvestigation(null, { failingReaders: ['logs'], proposeFails: true });
  await investigate(run.parts);
  assert.ok(run.steps.includes('read deploy-history'));
  assert.match((lastPayload(run, 'brief_updated') as BriefPayload).summary, /No cause stands out yet\. Not yet reproduced in a test copy\.$/);
  const stop = lastPayload(run, 'investigation_stopped');
  const skipped = 'reading logs \\(NightCall refused the call\\); comparing possible causes \\(the model or network kept failing\\); reproducing the failure \\(no possible cause to test\\); proposing the mitigation \\(no reproduction was accepted\\)';
  assert.match(String(stop.summary), new RegExp(`Skipped: ${skipped}\\.$`));
  assert.equal(stop.reason, 'no_answer');
});

test('when the run time limit is reached the remaining steps are skipped and the stop is still posted', async () => {
  const run = stubInvestigation('Rush it');
  run.parts.run = { skipped: [], fallbacks: [], openedAt: 0, deadline: 0, now: () => 1 };
  await investigate(run.parts);
  const stop = String(lastPayload(run, 'investigation_stopped').summary);
  assert.match(stop, /Did not ask about customer impact\./);
  assert.match(stop, /reading memory \(the run time limit was reached\)/);
  assert.equal(run.steps.includes('wait for answer'), false);
});

test("the question quotes measured values, and I don't know leaves impact unconfirmed and urgent", async () => {
  const run = stubInvestigation("I don't know");
  const decision = await investigate(run.parts);
  const question = eventsOf(run, 'question_asked')[0];
  const measured = "Shoppers' recommendation requests failed 2.71% of the time (frontend, 1.77 per second) while the recommendation service itself logged 12.30% errors, and the service ran out of memory and restarted 4 times in the last 10 minutes.";
  assert.ok(String(question.payload.text).startsWith(measured));
  assert.deepEqual(question.refs, ['q-impact', 'ev-failure-rate-1', 'ev-oom-events-1']);
  assert.equal(decision.urgency, 'rush');
  const brief = lastPayload(run, 'brief_updated') as BriefPayload;
  assert.equal(brief.unknowns[0], UNCONFIRMED_IMPACT);
  assert.equal(brief.nextStep, 'Treated as urgent. The mitigation is verified; no pull request is open yet.');
});
