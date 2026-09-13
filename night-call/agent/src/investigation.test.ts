import assert from 'node:assert/strict';
import { test } from 'node:test';

import { investigate } from './investigation.js';
import { GOOD_DRAFT, stubInvestigation } from './investigation-stubs.test.js';
import { UNCONFIRMED_IMPACT } from './urgency.js';

const payloadOf = (run: ReturnType<typeof stubInvestigation>, type: string) => run.events.filter((event) => event.type === type).at(-1)?.payload ?? {};

test("runs in the fixed order and treats I don't know as urgent", async () => {
  const run = stubInvestigation("I don't know");
  const decision = await investigate(run.parts);
  assert.deepEqual(run.steps, [
    'post role_status_changed', 'first brief', 'read failure-rate', 'post question_asked', 'post role_status_changed',
    'keep reading', 'wait for answer', 'reading stopped', 'draft brief', 'post brief_updated', 'post role_status_changed',
  ]);
  assert.equal(decision.urgency, 'rush');
  const brief = payloadOf(run, 'brief_updated') as { unknowns: string[]; nextStep: string };
  assert.equal(brief.unknowns[0], UNCONFIRMED_IMPACT);
  assert.match(brief.nextStep, /^This is treated as urgent, so next I go straight to the safest mitigation/);
  assert.equal(payloadOf(run, 'role_status_changed').status, 'finished');
});

test('N in the question comes from the failure-rate reading, not from model text', async () => {
  const run = stubInvestigation(null);
  await investigate(run.parts);
  assert.match(String(payloadOf(run, 'question_asked').text), /^Recommendations are failing on about 12 in 100 requests\./);
});

test('a free-text answer is classified after reading stops and the path follows it', async () => {
  const run = stubInvestigation('We can live with it for an hour');
  const decision = await investigate(run.parts);
  assert.deepEqual(run.steps.slice(7, 9), ['reading stopped', 'classify']);
  assert.equal(decision.urgency, 'tolerable');
  const brief = payloadOf(run, 'brief_updated') as { unknowns: string[]; nextStep: string };
  assert.equal(brief.unknowns.includes(UNCONFIRMED_IMPACT), false);
  assert.match(brief.nextStep, /tolerable for now/);
});

test('no answer after the wait is urgent and says impact is not confirmed', async () => {
  const run = stubInvestigation(null);
  assert.equal((await investigate(run.parts)).urgency, 'rush');
  const brief = payloadOf(run, 'brief_updated') as { summary: string; unknowns: string[] };
  assert.equal(brief.unknowns[0], UNCONFIRMED_IMPACT);
});

test('the question is still asked when the first brief fails', async () => {
  const run = stubInvestigation(null);
  run.parts.lead.writeFirstBrief = async () => {
    throw new Error('Stream ended without completing a message');
  };
  await investigate(run.parts);
  assert.ok(run.steps.includes('post question_asked'));
});

test('a drafted brief citing made-up evidence is replaced by one built from the real readings', async () => {
  const run = stubInvestigation("I don't know", { ...GOOD_DRAFT, knownFacts: [{ text: 'Invented', evidenceIds: ['ev-invented'] }] });
  await investigate(run.parts);
  const brief = payloadOf(run, 'brief_updated') as { summary: string; knownFacts: unknown[]; nextStep: string };
  assert.deepEqual(brief.knownFacts, [{ text: 'failing', evidenceIds: ['ev-logs-1'] }]);
  assert.match(brief.summary, /Answer about customer impact: "I don't know"/);
  assert.match(brief.nextStep, /treated as urgent/);
});
