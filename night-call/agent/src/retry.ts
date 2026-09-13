import { setTimeout as sleep } from 'node:timers/promises';

import { logProgress } from './progress.js';

export const RETRY_PAUSES_MS = [2_000, 6_000];

export type RetryOptions = { pause?: (milliseconds: number) => Promise<unknown>; signal?: AbortSignal };

type RetryPlan<Result> = { attempt: (number: number) => Promise<Result>; pause: (milliseconds: number) => Promise<unknown>; signal?: AbortSignal };

type ErrorLink = { message?: string; status?: number; code?: string; cause?: unknown };

const RETRYABLE_TEXT = /Stream ended without completing a message|ECONNRESET|socket hang up|Connection error|other side closed|terminated|maximum token limit/i;

function errorChain(error: unknown): ErrorLink[] {
  const links: ErrorLink[] = [];
  for (let link = error as ErrorLink | undefined; link && links.length < 6; link = link.cause as ErrorLink | undefined) links.push(link);
  return links;
}

function linkIsRetryable(link: ErrorLink): boolean {
  const status = link.status ?? 0;
  if (status === 429 || status >= 500) return true;
  return link.code === 'ECONNRESET' || RETRYABLE_TEXT.test(String(link.message ?? link));
}

export function isRetryable(error: unknown): boolean {
  return errorChain(error).some(linkIsRetryable);
}

export function describeError(error: unknown): string {
  return errorChain(error).map((link) => String(link.message ?? link)).join(' <- ').slice(0, 400);
}

async function attemptFrom<Result>(plan: RetryPlan<Result>, index: number): Promise<Result> {
  try {
    return await plan.attempt(index + 1);
  } catch (error) {
    if (index >= RETRY_PAUSES_MS.length || plan.signal?.aborted || !isRetryable(error)) throw error;
    logProgress({ retrying: index + 2, reason: describeError(error) });
    await plan.pause(RETRY_PAUSES_MS[index]);
    return attemptFrom(plan, index + 1);
  }
}

export function withRetries<Result>(attempt: (number: number) => Promise<Result>, options: RetryOptions = {}): Promise<Result> {
  return attemptFrom({ attempt, pause: options.pause ?? sleep, signal: options.signal }, 0);
}
