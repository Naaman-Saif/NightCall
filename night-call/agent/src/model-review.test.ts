import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SYMPTOM_CONTRACT } from './experiment-steps.js';
import { reviewerWith } from './model-reviewer.js';
import type { CheckResult } from './proof-types.js';
import { CODE_RULES_PREFIX, reviewedDecision } from './review-guard.js';
import { experimentDecision } from './review-rules.js';
import type { ModelReview } from './review-types.js';

const PASSING: CheckResult[] = [
  { name: 'fault.oom_kills', passed: true, observed: 3 },
  { name: 'fault.http_failures', passed: true, observed: 12 },
];

type Asked = { prompts: string[] };
type Case = { checks: CheckResult[]; answer: ModelReview | 'hang'; asked?: Asked };

async function decide(reviewCase: Case) {
  const { checks, answer } = reviewCase;
  const ask = async (prompt: string) => {
    reviewCase.asked?.prompts.push(prompt);
    return answer === 'hang' ? new Promise<ModelReview>(() => undefined) : answer;
  };
  const request = { kind: 'reproduction' as const, cause: 'The cache flag makes memory climb until the service is killed.', contract: SYMPTOM_CONTRACT, checks, verdict: 'matches' as const, evidence: 'Requests sent: 240' };
  return reviewedDecision(reviewerWith(ask, 20), { ...request, code: experimentDecision({ verdict: 'matches', checks }) });
}

test('the reviewer accepting a passing run is accepted with its reasons, and its prompt carries the checks and evidence', async () => {
  const asked: Asked = { prompts: [] };
  const reasons = ['The run recorded 3 out-of-memory kills and 12 failed requests, the same failure as the incident.'];
  assert.deepEqual(await decide({ checks: PASSING, answer: { accepted: true, reasons }, asked }), { accepted: true, reasons });
  assert.match(asked.prompts[0], /- fault\.oom_kills: passed, observed 3/);
  assert.match(asked.prompts[0], /Requests sent: 240/);
  assert.match(asked.prompts[0], /Cause: The cache flag makes memory climb/);
});

test('the reviewer may reject a passing run when a reason quotes an observed value', async () => {
  const reasons = ['Only 3 out-of-memory kills were seen, too few to match the incident.'];
  assert.deepEqual(await decide({ checks: PASSING, answer: { accepted: false, reasons } }), { accepted: false, reasons });
});

test('a reject that quotes no observed value is overridden to accept by the code rules', async () => {
  const decision = await decide({ checks: PASSING, answer: { accepted: false, reasons: ['The run does not look convincing.'] } });
  assert.deepEqual(decision, { accepted: true, reasons: ['fault.oom_kills passed with 3', 'fault.http_failures passed with 12'] });
});

test('a failed check is a reject even when the reviewer accepts', async () => {
  const checks = [PASSING[0], { name: 'fault.http_failures', passed: false, observed: 0 }];
  const decision = await decide({ checks, answer: { accepted: true, reasons: ['The run looks like the incident.'] } });
  assert.deepEqual(decision, { accepted: false, reasons: ['fault.http_failures failed with 0'] });
});

test('a review that times out on both attempts falls back to the code rules and says so first', async () => {
  const asked: Asked = { prompts: [] };
  const decision = await decide({ checks: PASSING, answer: 'hang', asked });
  assert.equal(asked.prompts.length, 2);
  assert.deepEqual(decision, { accepted: true, reasons: [CODE_RULES_PREFIX, 'fault.oom_kills passed with 3', 'fault.http_failures passed with 12'] });
});
