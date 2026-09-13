import assert from 'node:assert/strict';
import { test } from 'node:test';

import { proofApiFor } from './proof-api.js';
import { ToolAnswerError, type ToolClient } from './tool-client.js';

type Call = { method: string; path: string; body?: unknown };

function fakeClient(calls: Call[], reply: (call: Call) => unknown): ToolClient {
  const answer = async (call: Call) => {
    calls.push(call);
    const value = reply(call);
    if (value instanceof Error) throw value;
    return value;
  };
  return { get: (path) => answer({ method: 'GET', path }), post: (path, body) => answer({ method: 'POST', path, body }) };
}

test('an existing contract is reused from the 409 reply', async () => {
  const calls: Call[] = [];
  const investigator = fakeClient(calls, () => new ToolAnswerError(409, JSON.stringify({ code: 'contract_exists', contractId: 'c-7' })));
  const api = proofApiFor('inc-1', { investigator, verifier: investigator });
  assert.equal(await api.recordContract([]), 'c-7');
  assert.deepEqual(calls[0], { method: 'POST', path: '/tool/incidents/inc-1/contract', body: { checks: [] } });
});

test('job replies are read from the result, and queued counts as running', async () => {
  const calls: Call[] = [];
  const result = { verdict: 'matches', checks: [{ name: 'fault.oom_kills', passed: true, observed: 2 }], failureReason: null };
  const verifier = fakeClient(calls, (call) => (call.path.includes('job-2') ? { state: 'finished', result } : { state: 'queued', result: null }));
  const api = proofApiFor('inc-1', { investigator: verifier, verifier });
  assert.equal((await api.waitForJob('job-1', 'verifier')).state, 'running');
  assert.deepEqual(await api.waitForJob('job-2', 'verifier'), { state: 'finished', verdict: 'matches', checks: result.checks, failureReason: null });
  assert.equal(calls[1].path, '/tool/incidents/inc-1/jobs/job-2?waitSeconds=60');
});

test('the pull request state is read from the tool case route, and a case without it reads as nothing yet', async () => {
  const calls: Call[] = [];
  const replies = [{ publication: { state: 'published', url: 'https://github.com/x/y/pull/2', failureReason: null } }, { incident: {} }];
  const verifier = fakeClient(calls, () => replies.shift());
  const api = proofApiFor('inc-1', { investigator: verifier, verifier });
  assert.deepEqual(await api.readPublication(), { state: 'published', url: 'https://github.com/x/y/pull/2', failureReason: null });
  assert.equal(await api.readPublication(), null);
  assert.deepEqual(calls.map((call) => call.path), ['/tool/incidents/inc-1/case', '/tool/incidents/inc-1/case']);
});

test('reviews go to the frozen routes with the frozen bodies', async () => {
  const calls: Call[] = [];
  const verifier = fakeClient(calls, () => ({ eventId: 'e-1' }));
  const api = proofApiFor('inc-1', { investigator: verifier, verifier });
  await api.reviewExperiment({ id: 'exp-1', accepted: false, reasons: ['x'] });
  await api.reviewVerification({ id: 'run-1', accepted: true, reasons: ['y'] });
  assert.deepEqual(calls, [
    { method: 'POST', path: '/tool/incidents/inc-1/experiments/exp-1/review', body: { accepted: false, reasons: ['x'] } },
    { method: 'POST', path: '/tool/incidents/inc-1/verifications/run-1/review', body: { approved: true, reasons: ['y'] } },
  ]);
});
