import { setTimeout as sleep } from 'node:timers/promises';

import type { Answer, IncidentApi } from './incident-api.js';
import { logProgress } from './progress.js';
import { ToolAnswerError } from './tool-client.js';
import { IMPACT_QUESTION_ID } from './urgency.js';

export const ANSWER_WAIT_MS = 8 * 60_000;
const LONGEST_POLL_SECONDS = 60;
const QUICK_REPLY_MS = 1_000;
const PAUSE_AFTER_QUICK_REPLY_MS = 5_000;

export type Clock = { now(): number; pause(milliseconds: number): Promise<unknown> };

export const realClock: Clock = { now: () => Date.now(), pause: (milliseconds) => sleep(milliseconds) };

type WaitPlan = { api: IncidentApi; clock: Clock; deadline: number };

export function latestImpactAnswer(answers: Answer[]): Answer | null {
  return answers.filter((answer) => answer.questionId === IMPACT_QUESTION_ID).at(-1) ?? null;
}

async function answersOrNone(plan: WaitPlan, waitSeconds: number): Promise<Answer[]> {
  try {
    return await plan.api.waitForAnswers(waitSeconds);
  } catch (error) {
    if (error instanceof ToolAnswerError && error.status === 404) throw error;
    logProgress({ contextWaitError: String(error).slice(0, 200) });
    return [];
  }
}

async function pollUntilDeadline(plan: WaitPlan): Promise<Answer | null> {
  const secondsLeft = Math.ceil((plan.deadline - plan.clock.now()) / 1000);
  if (secondsLeft <= 0) return null;
  const startedAt = plan.clock.now();
  const answer = latestImpactAnswer(await answersOrNone(plan, Math.min(LONGEST_POLL_SECONDS, secondsLeft)));
  if (answer) return answer;
  if (plan.clock.now() - startedAt < QUICK_REPLY_MS) await plan.clock.pause(PAUSE_AFTER_QUICK_REPLY_MS);
  return pollUntilDeadline(plan);
}

export function waitForImpactAnswer(api: IncidentApi, clock: Clock = realClock): Promise<Answer | null> {
  return pollUntilDeadline({ api, clock, deadline: clock.now() + ANSWER_WAIT_MS });
}
