import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isRetryable, withRetries } from './retry.js';
import { budgetOf, BUDGET_USED, withBudget } from './tool-budget.js';

function failingFirst(failures: number, error: unknown) {
  const attempts: number[] = [];
  const attempt = async (number: number) => {
    attempts.push(number);
    if (number <= failures) throw error;
    return 'answered';
  };
  return { attempt, attempts };
}

function recordedPauses() {
  const pauses: number[] = [];
  return { pauses, pause: async (milliseconds: number) => pauses.push(milliseconds) };
}

test('a stream that ends early is retried with a fresh attempt after 2 s', async () => {
  const run = failingFirst(1, new Error('Stream ended without completing a message'));
  const timer = recordedPauses();
  assert.equal(await withRetries(run.attempt, { pause: timer.pause }), 'answered');
  assert.deepEqual(run.attempts, [1, 2]);
  assert.deepEqual(timer.pauses, [2_000]);
});

test('three attempts at most, pausing 2 s then 6 s, then the error surfaces', async () => {
  const run = failingFirst(5, Object.assign(new Error('rate limited'), { status: 429 }));
  const timer = recordedPauses();
  await assert.rejects(withRetries(run.attempt, { pause: timer.pause }), /rate limited/);
  assert.deepEqual(run.attempts, [1, 2, 3]);
  assert.deepEqual(timer.pauses, [2_000, 6_000]);
});

test('an error that is not transient is not retried', async () => {
  const run = failingFirst(1, Object.assign(new Error('bad request'), { status: 400 }));
  await assert.rejects(withRetries(run.attempt, recordedPauses()), /bad request/);
  assert.deepEqual(run.attempts, [1]);
});

test('server errors, 429 and connection resets deep in the cause chain are transient', () => {
  assert.equal(isRetryable(Object.assign(new Error('upstream'), { status: 503 })), true);
  assert.equal(isRetryable(new Error('model failed', { cause: Object.assign(new Error('read'), { code: 'ECONNRESET' }) })), true);
  assert.equal(isRetryable(new Error('Connection error.')), true);
  assert.equal(isRetryable(new Error('invalid schema')), false);
});

test('after 12 calls every tool answers that the budget is used', async () => {
  const budget = budgetOf(12);
  let reads = 0;
  const readTool = withBudget(budget, async () => `reading ${(reads += 1)}`);
  const writeTool = withBudget(budget, async () => 'written');
  for (let call = 0; call < 11; call += 1) await readTool({});
  assert.equal(await writeTool({}), 'written');
  assert.equal(await readTool({}), BUDGET_USED);
  assert.equal(await writeTool({}), BUDGET_USED);
  assert.equal(reads, 11);
});
