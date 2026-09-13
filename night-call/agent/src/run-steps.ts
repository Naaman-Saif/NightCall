import type { EvidenceLedger } from './evidence-ledger.js';
import type { Answer, IncidentApi } from './incident-api.js';
import type { Lead } from './lead-steps.js';
import { logProgress } from './progress.js';
import type { ProofRecord } from './proof-record.js';
import { refusalWords } from './proof-replies.js';
import type { ProofApi } from './proof-types.js';
import { describeError, isRetryable } from './retry.js';
import { ToolAnswerError } from './tool-client.js';

export const BUDGET_MS = 30 * 60_000;

export type RunState = { skipped: string[]; fallbacks: string[]; openedAt: number; deadline: number; now: () => number; pause?: (ms: number) => Promise<unknown> };
export type RunTiming = { now?: () => number; openedAt?: number; deadline?: number };
export type StepPlan<Result> = { nowDoing: string; skipLabel: string; work: () => Promise<Result> };

export type RunContext = {
  api: IncidentApi;
  ledger: EvidenceLedger;
  lead: Lead;
  proof: ProofApi;
  record: ProofRecord;
  run: RunState;
  waitForAnswer?: (api: IncidentApi) => Promise<Answer | null>;
};

export class NotReady extends Error {}

export function newRun(timing: RunTiming = {}): RunState {
  const now = timing.now ?? Date.now;
  const openedAt = timing.openedAt ?? now();
  return { skipped: [], fallbacks: [], openedAt, deadline: timing.deadline ?? openedAt + BUDGET_MS, now };
}

export function minutesElapsed(run: RunState): number {
  return (run.now() - run.openedAt) / 60_000;
}

export function timeLeftMs(run: RunState): number {
  return Math.max(0, run.deadline - run.now());
}

export function stepSignal(run: RunState, capMs: number): AbortSignal {
  return AbortSignal.timeout(Math.max(1, Math.min(capMs, timeLeftMs(run))));
}

export async function postStatus(context: RunContext, status: { status: string; assignment: string }): Promise<void> {
  try {
    await context.api.postEvent({ type: 'role_status_changed', summary: status.assignment, payload: { role: 'lead', ...status } });
  } catch (error) {
    logProgress({ statusRefused: describeError(error) });
  }
}

function failureWords(error: unknown): string {
  if (error instanceof NotReady) return error.message;
  if (error instanceof ToolAnswerError && error.status === 404) return 'not available on this server yet';
  if (error instanceof ToolAnswerError) return refusalWords(error) ?? 'NightCall refused the call';
  if (/abort|timeout/i.test(describeError(error))) return 'it ran out of time';
  return isRetryable(error) ? 'the model or network kept failing' : 'it failed';
}

function skip(run: RunState, label: string): null {
  run.skipped.push(label);
  return null;
}

export async function runStep<Result>(context: RunContext, step: StepPlan<Result>): Promise<Result | null> {
  if (timeLeftMs(context.run) === 0) return skip(context.run, `${step.skipLabel} (the run time limit was reached)`);
  await postStatus(context, { status: 'working', assignment: step.nowDoing });
  try {
    return await step.work();
  } catch (error) {
    logProgress({ stepSkipped: step.skipLabel, reason: describeError(error) });
    return skip(context.run, `${step.skipLabel} (${failureWords(error)})`);
  }
}
