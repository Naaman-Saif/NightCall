import type { Answer } from './incident-api.js';
import type { ProgressEvent } from './progress.js';

export const IMPACT_QUESTION_ID = 'q-impact';
export const I_DO_NOT_KNOW = "I don't know";
export const UNCONFIRMED_IMPACT = 'Customer impact not confirmed, treating it as urgent';

export type Urgency = 'rush' | 'tolerable';
export type Classification = { urgency: Urgency; reason: string };
export type UrgencyDecision = Classification & { impactConfirmed: boolean };
export type Classify = (answer: string) => Promise<Classification>;

export function failuresPer100(errorShare: number | null): number {
  return Math.max(1, Math.round((errorShare ?? 0) * 100));
}

export function impactQuestionEvent(failures: number): ProgressEvent {
  const text = `Recommendations are failing on about ${failures} in 100 requests. Is that tolerable while I test a fix, or should I rush the safest fix first?`;
  const payload = {
    questionId: IMPACT_QUESTION_ID,
    text,
    whyItMatters: 'If it is urgent, I go straight to the safest mitigation and verify it. If it is tolerable, I finish checking the other explanation before choosing.',
    meanwhile: 'I keep gathering evidence.',
    blocks: 'none',
  };
  return { type: 'question_asked', summary: text, refs: [IMPACT_QUESTION_ID], payload };
}

export async function decideUrgency(answer: Answer | null, classify: Classify): Promise<UrgencyDecision> {
  if (answer === null) return { urgency: 'rush', reason: 'No answer arrived in time.', impactConfirmed: false };
  if (answer.text.trim() === I_DO_NOT_KNOW) return { urgency: 'rush', reason: 'The impact is not known.', impactConfirmed: false };
  return { ...(await classify(answer.text)), impactConfirmed: true };
}

export function pathSentence(decision: UrgencyDecision): string {
  if (decision.urgency === 'tolerable') {
    return 'The failures are tolerable for now, so next I finish checking the other explanation, then choose and verify the safest mitigation.';
  }
  return 'This is treated as urgent, so next I go straight to the safest mitigation and verify it before anything else.';
}
