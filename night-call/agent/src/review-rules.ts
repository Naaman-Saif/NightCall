import type { CheckResult, JobResult, Verdict } from './proof-types.js';

export type ReviewDecision = { accepted: boolean; reasons: string[] };

function failedChecks(checks: CheckResult[]): string[] {
  return checks.filter((check) => !check.passed && check.observed !== null).map((check) => `${check.name} failed with ${check.observed}`);
}

function missingObservations(checks: CheckResult[]): string[] {
  return checks.filter((check) => check.observed === null).map((check) => `${check.name} has no observation`);
}

function passedChecks(checks: CheckResult[]): string[] {
  return checks.filter((check) => check.passed && check.observed !== null).map((check) => `${check.name} passed with ${check.observed}`);
}

export function experimentDecision(outcome: { verdict: Verdict | null; checks: CheckResult[] }): ReviewDecision {
  const verdictProblem = outcome.verdict === 'matches' ? [] : [`the verdict is ${outcome.verdict ?? 'missing'}`];
  const noChecks = outcome.checks.length === 0 ? ['no checks were reported'] : [];
  const problems = [...verdictProblem, ...noChecks, ...failedChecks(outcome.checks), ...missingObservations(outcome.checks)];
  return problems.length === 0 ? { accepted: true, reasons: passedChecks(outcome.checks) } : { accepted: false, reasons: problems };
}

export function verificationDecision(result: JobResult): ReviewDecision {
  const jobProblem = result.state === 'finished' ? [] : [`the verification job ${result.state === 'failed' ? 'failed' : 'did not finish'}`];
  const reason = result.failureReason ? [result.failureReason] : [];
  const decision = experimentDecision(result);
  if (jobProblem.length === 0 && decision.accepted) return { accepted: true, reasons: ['all three rounds passed', ...decision.reasons] };
  return { accepted: false, reasons: [...jobProblem, ...reason, ...(decision.accepted ? [] : decision.reasons)] };
}
