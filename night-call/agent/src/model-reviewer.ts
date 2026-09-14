import { Agent } from '@strands-agents/sdk';
import { z } from 'zod';

import { buildModel, readRoleSetting, reasoningFor, type RoleSetting } from './model.js';
import { logProgress } from './progress.js';
import { describeError } from './retry.js';
import { REVIEWER_SYSTEM_PROMPT, reviewPrompt } from './review-prompt.js';
import type { ModelReview, Reviewer } from './review-types.js';

export const REVIEW_TIMEOUT_MS = 120_000;
export const REVIEW_ATTEMPTS = 2;
export const REVIEW_MAX_TOKENS = 1200;
const REVIEW_TURN_LIMIT = 3;

export function reviewSetting(env: NodeJS.ProcessEnv = process.env): RoleSetting {
  return { ...readRoleSetting('VERIFIER', env), role: 'REVIEW', reasoning: reasoningFor('REVIEW', env), maxTokens: REVIEW_MAX_TOKENS };
}

const reviewShape = z.object({ decision: z.enum(['accept', 'reject']), reasons: z.array(z.string().min(1).max(300)).min(1).max(4) });

export type AskModel = (prompt: string, signal: AbortSignal) => Promise<ModelReview>;
type AskPlan = { ask: AskModel; prompt: string; timeoutMs: number };

async function askVerifierModel(prompt: string, signal: AbortSignal): Promise<ModelReview> {
  const setting = reviewSetting();
  const agent = new Agent({ model: await buildModel(setting), tools: [], printer: false, systemPrompt: REVIEWER_SYSTEM_PROMPT, retryStrategy: null, structuredOutputSchema: reviewShape });
  const startedAt = Date.now();
  const result = await agent.invoke(prompt, { cancelSignal: signal, limits: { turns: REVIEW_TURN_LIMIT } });
  const usage = result.metrics?.accumulatedUsage;
  const seconds = Number(((Date.now() - startedAt) / 1000).toFixed(1));
  logProgress({ reviewCall: `${setting.modelId} reasoning ${setting.reasoning}`, seconds, inputTokens: usage?.inputTokens, outputTokens: usage?.outputTokens });
  const parsed = reviewShape.parse(result.structuredOutput);
  return { accepted: parsed.decision === 'accept', reasons: parsed.reasons };
}

function timeoutAfter(timeoutMs: number, controller: AbortController): { expired: Promise<never>; stop: () => void } {
  const timer: { handle?: NodeJS.Timeout } = {};
  const expired = new Promise<never>((_resolve, reject) => {
    timer.handle = setTimeout(() => {
      controller.abort();
      reject(new Error(`the review took longer than ${timeoutMs / 1000} s`));
    }, timeoutMs);
  });
  return { expired, stop: () => clearTimeout(timer.handle) };
}

async function askOnce(plan: AskPlan): Promise<ModelReview> {
  const controller = new AbortController();
  const timeout = timeoutAfter(plan.timeoutMs, controller);
  try {
    return await Promise.race([plan.ask(plan.prompt, controller.signal), timeout.expired]);
  } finally {
    timeout.stop();
  }
}

async function askWithRetry(plan: AskPlan, attempt: number): Promise<ModelReview> {
  try {
    return await askOnce(plan);
  } catch (error) {
    logProgress({ reviewAttemptFailed: attempt, reason: describeError(error) });
    if (attempt >= REVIEW_ATTEMPTS) throw error;
    return askWithRetry(plan, attempt + 1);
  }
}

export function reviewerWith(ask: AskModel, timeoutMs: number = REVIEW_TIMEOUT_MS): Reviewer {
  return { review: (request) => askWithRetry({ ask, prompt: reviewPrompt(request), timeoutMs }, 1) };
}

export function modelReviewer(): Reviewer {
  return reviewerWith(askVerifierModel);
}
