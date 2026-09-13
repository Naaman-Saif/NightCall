import type { EvidenceLedger } from './evidence-ledger.js';
import type { Answer, IncidentApi } from './incident-api.js';
import type { Lead } from './lead-steps.js';
import { logProgress } from './progress.js';
import { describeError, isRetryable } from './retry.js';
import { ToolAnswerError } from './tool-client.js';

export const RUN_LIMIT_MS = 12 * 60_000;

export type RunState = { skipped: string[]; fallbacks: string[]; deadline: number; now: () => number };
export type StepPlan<Result> = { nowDoing: string; skipLabel: string; work: () => Promise<Result> };

export type RunContext = {
  api: IncidentApi;
  ledger: EvidenceLedger;
  lead: Lead;
  run: RunState;
  waitForAnswer?: (api: IncidentApi) => Promise<Answer | null>;
};

export function newRun(now: () => number = Date.now): RunState {
  return { skipped: [], fallbacks: [], deadline: now() + RUN_LIMIT_MS, now };
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
  if (error instanceof ToolAnswerError) return error.status === 404 ? 'not available on this server yet' : 'NightCall refused the call';
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
