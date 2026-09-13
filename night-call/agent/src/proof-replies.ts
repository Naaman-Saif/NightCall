import type { CheckResult, ExperimentStarted, JobResult, Started, Verdict } from './proof-types.js';
import { ToolAnswerError } from './tool-client.js';

type Loose = Record<string, unknown>;

const VERDICTS: string[] = ['matches', 'differs', 'inconclusive', 'failed'];

const REFUSAL_WORDS: Record<string, string> = {
  contract_missing: 'no symptom checks were recorded',
  job_running: 'another test copy job was still running',
  past_exploration_cutoff: 'it would have run past minute 12',
  past_verification_cutoff: 'it was past minute 13',
  no_accepted_reproduction: 'no reproduction was accepted',
  run_not_current: 'a newer verification run replaced it',
  not_three_passed: 'the three rounds did not all pass',
  failed_check_accepted: 'NightCall refused to accept a failed check',
  unknown_variant: 'the flag has no such variant',
};

export function textOf(reply: unknown, key: string): string {
  const value = ((reply ?? {}) as Loose)[key];
  return typeof value === 'string' ? value : '';
}

export function requireText(reply: unknown, key: string): string {
  const value = textOf(reply, key);
  if (value === '') throw new Error(`the server reply has no ${key}`);
  return value;
}

export function refusalOf(error: unknown): Loose {
  if (!(error instanceof ToolAnswerError)) return {};
  try {
    return (JSON.parse(error.detail) ?? {}) as Loose;
  } catch {
    return {};
  }
}

export function refusalCode(error: unknown): string {
  return textOf(refusalOf(error), 'code');
}

export function refusalWords(error: unknown): string | null {
  return REFUSAL_WORDS[refusalCode(error)] ?? null;
}

export function startedOf(reply: unknown): Started {
  return { id: requireText(reply, 'verificationRunId'), jobId: requireText(reply, 'jobId') };
}

export function experimentStartedOf(reply: unknown): ExperimentStarted {
  const estimate = ((reply ?? {}) as Loose).estimatedMinutes;
  const estimatedMinutes = typeof estimate === 'number' ? estimate : null;
  return { id: requireText(reply, 'experimentId'), jobId: requireText(reply, 'jobId'), recipeSource: textOf(reply, 'recipeSource'), estimatedMinutes };
}

export function jobResultOf(reply: unknown): JobResult {
  const state = textOf(reply, 'state');
  const result = (((reply ?? {}) as Loose).result ?? {}) as Loose;
  const verdict = textOf(result, 'verdict');
  return {
    state: state === 'finished' || state === 'failed' ? state : 'running',
    verdict: VERDICTS.includes(verdict) ? (verdict as Verdict) : null,
    checks: Array.isArray(result.checks) ? (result.checks as CheckResult[]) : [],
    failureReason: textOf(result, 'failureReason') || null,
  };
}
