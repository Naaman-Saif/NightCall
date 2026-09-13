import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EVIDENCE_BRIEF_SUMMARY } from './answer-brief.js';
import { investigate } from './investigation.js';
import { GOOD_DRAFT, stubInvestigation } from './investigation-stubs.test.js';
import { UNCONFIRMED_IMPACT } from './urgency.js';

type BriefPayload = { summary: string; knownFacts: unknown[]; unknowns: string[]; nextStep: string };

const READING_FACTS = [{ text: 'failing', evidenceIds: ['ev-logs-1'] }, { text: '4 out-of-memory events', evidenceIds: ['ev-oom-events-1'] }];
const eventsOf = (run: ReturnType<typeof stubInvestigation>, type: string) => run.events.filter((event) => event.type === type);
const lastPayload = (run: ReturnType<typeof stubInvestigation>, type: string) => eventsOf(run, type).at(-1)?.payload ?? {};

test("reads, asks, then briefs while waiting, and treats I don't know as urgent", async () => {
  const run = stubInvestigation("I don't know");
  const decision = await investigate(run.parts);
  assert.deepEqual(run.steps, [
    'post role_status_changed', 'read failure-rate', 'read oom-events', 'post question_asked', 'post role_status_changed', 'first brief',
    'wait for answer', 'post brief_updated', 'keep reading', 'reading stopped', 'draft brief', 'post brief_updated', 'post role_status_changed',
  ]);
  assert.equal(decision.urgency, 'rush');
  const brief = lastPayload(run, 'brief_updated') as BriefPayload;
  assert.equal(brief.unknowns[0], UNCONFIRMED_IMPACT);
  assert.match(brief.nextStep, /^This is treated as urgent, so next I go straight to the safest mitigation/);
  assert.equal(lastPayload(run, 'role_status_changed').status, 'finished');
});

test('the question quotes the measured share and crash count and refs the readings', async () => {
  const run = stubInvestigation(null);
  await investigate(run.parts);
  const question = eventsOf(run, 'question_asked')[0];
  const expected = '12.3% of recommendation requests failed in the last 10 minutes, and the service ran out of memory and restarted 4 times in the last 10 minutes. Is that tolerable';
  assert.ok(String(question.payload.text).startsWith(expected));
  assert.deepEqual(question.refs, ['q-impact', 'ev-logs-1', 'ev-oom-events-1']);
});

test('without a written brief the page gets a brief built only from the readings', async () => {
  const run = stubInvestigation(null);
  run.parts.lead.writeFirstBrief = async () => {
    throw new Error('Model reached maximum token limit.');
  };
  await investigate(run.parts);
  const first = eventsOf(run, 'brief_updated')[0].payload as BriefPayload;
  assert.equal(first.summary, EVIDENCE_BRIEF_SUMMARY);
  assert.deepEqual(first.knownFacts, READING_FACTS);
});

test('an answer arriving mid-brief stops the brief and skips the evidence-only brief', async () => {
  const run = stubInvestigation('Rush it');
  run.parts.lead.writeFirstBrief = (request) => new Promise((_, reject) => request.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  await investigate(run.parts);
  assert.equal(eventsOf(run, 'brief_updated').length, 1);
  assert.equal(run.steps.includes('keep reading'), false);
});

test('a free-text answer is classified after reading stops and the path follows it', async () => {
  const run = stubInvestigation('We can live with it for an hour');
  const decision = await investigate(run.parts);
  assert.ok(run.steps.indexOf('classify') > run.steps.indexOf('reading stopped'));
  assert.equal(decision.urgency, 'tolerable');
  const brief = lastPayload(run, 'brief_updated') as BriefPayload;
  assert.equal(brief.unknowns.includes(UNCONFIRMED_IMPACT), false);
  assert.match(brief.nextStep, /tolerable for now/);
});

test('a drafted brief citing made-up evidence is replaced by one built from the real readings', async () => {
  const run = stubInvestigation("I don't know", { draft: { ...GOOD_DRAFT, knownFacts: [{ text: 'Invented', evidenceIds: ['ev-invented'] }] } });
  await investigate(run.parts);
  const brief = lastPayload(run, 'brief_updated') as BriefPayload;
  assert.deepEqual(brief.knownFacts, READING_FACTS);
  assert.equal(brief.summary, '12.3% of recommendation requests failed in the last 10 minutes. Answer about customer impact: "I don\'t know".');
  assert.match(brief.nextStep, /treated as urgent/);
});
