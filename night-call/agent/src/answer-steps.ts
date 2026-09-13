import { setTimeout as sleep } from 'node:timers/promises';

import { waitForImpactAnswer } from './context-wait.js';
import type { Answer } from './incident-api.js';
import { runStep, stepSignal, timeLeftMs, type RunContext } from './run-steps.js';
import type { Classification } from './urgency.js';

export type PendingAnswer = Promise<Answer | null> | null;

const UNREADABLE_ANSWER: Classification = { urgency: 'rush', reason: 'The answer could not be read, so this is treated as urgent.' };
const CLASSIFY_CAP_MS = 60_000;
const NOT_YET = Symbol('not yet');

export function pendingAnswer(context: RunContext, asked: boolean): PendingAnswer {
  if (!asked) return null;
  return (context.waitForAnswer ?? waitForImpactAnswer)(context.api).catch(() => null);
}

function answeredYet(pending: Promise<Answer | null>): Promise<Answer | null | typeof NOT_YET> {
  return Promise.race([pending, Promise.resolve(NOT_YET)]);
}

async function waitForAnswer(context: RunContext, pending: Promise<Answer | null>): Promise<Answer | null> {
  const early = await answeredYet(pending);
  if (early !== NOT_YET) return early;
  const work = () => Promise.race([pending, sleep(timeLeftMs(context.run), null, { ref: false })]);
  return (await runStep(context, { nowDoing: 'Waiting for the answer about customer impact', skipLabel: 'waiting for the answer', work })) ?? null;
}

export async function answerAtDecision(context: RunContext, pending: PendingAnswer): Promise<Answer | null> {
  if (pending === null) return null;
  if (context.record.contractId === null) return waitForAnswer(context, pending);
  const early = await answeredYet(pending);
  return early === NOT_YET ? null : early;
}

export function classifyWithSkip(context: RunContext) {
  return async (answer: string): Promise<Classification> => {
    const onFallback = () => context.run.fallbacks.push('reading the answer');
    const work = () => context.lead.classify({ answer, signal: stepSignal(context.run, CLASSIFY_CAP_MS), onFallback });
    return (await runStep(context, { nowDoing: 'Reading the answer about customer impact', skipLabel: 'reading the answer', work })) ?? UNREADABLE_ANSWER;
  };
}
