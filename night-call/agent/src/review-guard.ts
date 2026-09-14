import { logProgress } from './progress.js';
import type { CheckResult } from './proof-types.js';
import { describeError } from './retry.js';
import type { ReviewDecision } from './review-rules.js';
import type { ModelReview, Reviewer, ReviewRequest } from './review-types.js';

export const CODE_RULES_PREFIX = 'Reviewed by code rules (the model review did not finish).';

const NUMBER = /\d+(?:\.\d+)?/g;

type GuardInput = { code: ReviewDecision; checks: CheckResult[] };

export function quotesObservedValue(reasons: string[], checks: CheckResult[]): boolean {
  const numbers = (reasons.join(' ').match(NUMBER) ?? []).map(Number);
  const observed = checks.map((check) => check.observed).filter((value): value is number | string => value !== null);
  return observed.some((value) => {
    const asNumber = Number(value);
    return Number.isNaN(asNumber) ? reasons.some((reason) => reason.includes(String(value))) : numbers.includes(asNumber);
  });
}

export function guardedDecision(input: GuardInput, model: ModelReview | null): ReviewDecision {
  if (model === null) return { accepted: input.code.accepted, reasons: [CODE_RULES_PREFIX, ...input.code.reasons] };
  if (!input.code.accepted) {
    if (model.accepted) logProgress({ reviewerOverride: 'rejected: a check failed or has no observation', modelReasons: model.reasons });
    return input.code;
  }
  if (model.accepted) return { accepted: true, reasons: model.reasons };
  if (quotesObservedValue(model.reasons, input.checks)) return { accepted: false, reasons: model.reasons };
  logProgress({ reviewerOverride: 'accepted: the model rejected without quoting an observed value', modelReasons: model.reasons });
  return input.code;
}

export async function reviewedDecision(reviewer: Reviewer, request: ReviewRequest & { code: ReviewDecision }): Promise<ReviewDecision> {
  const { code, ...question } = request;
  const model = await reviewer.review(question).catch((error: unknown) => {
    logProgress({ modelReviewFallback: request.kind, reason: describeError(error) });
    return null;
  });
  return guardedDecision({ code, checks: request.checks }, model);
}
