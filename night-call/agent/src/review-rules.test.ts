import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CheckResult, JobResult } from './proof-types.js';
import { experimentDecision, verificationDecision } from './review-rules.js';

const passing: CheckResult[] = [
  { name: 'fault.oom_kills', passed: true, observed: 3 },
  { name: 'fault.http_failures', passed: true, observed: 12 },
];

const job = (overrides: Partial<JobResult>): JobResult => ({ state: 'finished', verdict: 'matches', checks: [{ name: 'mitigated.restarts', passed: true, observed: 0 }], failureReason: null, ...overrides });

test('an experiment is accepted only when it matches and every check passed with an observation', () => {
  assert.deepEqual(experimentDecision({ verdict: 'matches', checks: passing }), { accepted: true, reasons: ['fault.oom_kills passed with 3', 'fault.http_failures passed with 12'] });
});

test('a failed check can never be accepted', () => {
  const checks = [passing[0], { name: 'fault.http_failures', passed: false, observed: 0 }];
  assert.deepEqual(experimentDecision({ verdict: 'matches', checks }), { accepted: false, reasons: ['fault.http_failures failed with 0'] });
});

test('a missing observation is a reject reason, even when the check claims to pass', () => {
  const checks = [passing[0], { name: 'fault.http_failures', passed: true, observed: null }];
  assert.deepEqual(experimentDecision({ verdict: 'matches', checks }).reasons, ['fault.http_failures has no observation']);
  assert.deepEqual(experimentDecision({ verdict: 'inconclusive', checks: passing }).reasons, ['the verdict is inconclusive']);
  assert.deepEqual(experimentDecision({ verdict: null, checks: [] }).reasons, ['the verdict is missing', 'no checks were reported']);
});

test('verification is approved only for a finished matching run with every check passed', () => {
  assert.deepEqual(verificationDecision(job({})), { accepted: true, reasons: ['all three rounds passed', 'mitigated.restarts passed with 0'] });
});

test('a failed job, a failed check or a missing observation stops approval with the reason', () => {
  const failedCheck = job({ verdict: 'differs', checks: [{ name: 'mitigated.restarts', passed: false, observed: 2 }] });
  assert.deepEqual(verificationDecision(failedCheck).reasons, ['the verdict is differs', 'mitigated.restarts failed with 2']);
  assert.deepEqual(verificationDecision(job({ checks: [{ name: 'mitigated.restarts', passed: true, observed: null }] })).reasons, ['mitigated.restarts has no observation']);
  const failedJob = job({ state: 'failed', verdict: 'failed', checks: [], failureReason: 'round 2 could not start' });
  assert.deepEqual(verificationDecision(failedJob).reasons, ['the verification job failed', 'round 2 could not start', 'the verdict is failed', 'no checks were reported']);
});
