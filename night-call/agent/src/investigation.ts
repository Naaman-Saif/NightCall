import { setTimeout as sleep } from 'node:timers/promises';

import { postCauseBrief } from './answer-brief.js';
import { findCauses, type CauseOutcome } from './causes.js';
import { waitForImpactAnswer } from './context-wait.js';
import { askImpact, readEvidence } from './evidence-steps.js';
import type { Answer } from './incident-api.js';
import { newRun, postStatus, runStep, stepSignal, timeLeftMs, type RunContext, type RunState } from './run-steps.js';
import { postStopped, type StopFacts } from './stop-report.js';
import { decideUrgency, pathSentence, type Classification, type UrgencyDecision } from './urgency.js';

export type InvestigationParts = Omit<RunContext, 'run'> & { run?: RunState };

type RunOutcome = CauseOutcome & { answer: Answer | null; decision: UrgencyDecision; asked: boolean };

const UNREADABLE_ANSWER: Classification = { urgency: 'rush', reason: 'The answer could not be read, so this is treated as urgent.' };
const CLASSIFY_CAP_MS = 60_000;
const NOT_YET = Symbol('not yet');

function pendingAnswer(context: RunContext, asked: boolean): Promise<Answer | null> | null {
  if (!asked) return null;
  return (context.waitForAnswer ?? waitForImpactAnswer)(context.api).catch(() => null);
}

async function awaitAnswer(context: RunContext, pending: Promise<Answer | null> | null): Promise<Answer | null> {
  if (pending === null) return null;
  const early = await Promise.race([pending, Promise.resolve(NOT_YET)]);
  if (early !== NOT_YET) return early;
  const work = () => Promise.race([pending, sleep(timeLeftMs(context.run), null, { ref: false })]);
  return (await runStep(context, { nowDoing: 'Waiting for the answer about customer impact', skipLabel: 'waiting for the answer', work })) ?? null;
}

function classifyWithSkip(context: RunContext) {
  return async (answer: string): Promise<Classification> => {
    const work = () => context.lead.classify({ answer, signal: stepSignal(context.run, CLASSIFY_CAP_MS) });
    return (await runStep(context, { nowDoing: 'Reading the answer about customer impact', skipLabel: 'reading the answer', work })) ?? UNREADABLE_ANSWER;
  };
}

async function investigationSteps(context: RunContext): Promise<RunOutcome> {
  const asked = await askImpact(context);
  const pending = pendingAnswer(context, asked);
  await readEvidence(context);
  const causes = await findCauses(context);
  const answer = await awaitAnswer(context, pending);
  const decision = await decideUrgency(answer, classifyWithSkip(context));
  const facts = { answer, decision, ...causes };
  await runStep(context, { nowDoing: 'Writing the report', skipLabel: 'writing the report', work: () => postCauseBrief(context, facts) });
  await postStatus(context, { status: 'finished', assignment: pathSentence(decision) });
  return { ...facts, asked };
}

function stopFacts(context: RunContext, outcome: RunOutcome | null): StopFacts {
  const reason = outcome === null ? 'error' : outcome.answer ? 'answer_recorded' : 'no_answer';
  const counts = { causes: outcome?.causes.length ?? 0, mostLikely: outcome?.mostLikely?.claim ?? null };
  return { ledger: context.ledger, reason, answer: outcome?.answer ?? null, asked: outcome?.asked ?? false, ...counts, skipped: context.run.skipped };
}

export async function investigate(parts: InvestigationParts): Promise<UrgencyDecision> {
  const context: RunContext = { ...parts, run: parts.run ?? newRun() };
  try {
    const outcome = await investigationSteps(context);
    await postStopped(context.api, stopFacts(context, outcome));
    return outcome.decision;
  } catch (error) {
    await postStopped(context.api, stopFacts(context, null));
    throw error;
  }
}
