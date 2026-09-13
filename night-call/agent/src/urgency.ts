import { evidenceIdsOf, impactQuestionText, requireMeasured, type ImpactReadings } from './impact-facts.js';
import type { Answer } from './incident-api.js';
import type { ProgressEvent } from './progress.js';

export const IMPACT_QUESTION_ID = 'q-impact';
export const I_DO_NOT_KNOW = "I don't know";
export const UNCONFIRMED_IMPACT = 'Customer impact not confirmed, treating it as urgent';

export type Urgency = 'rush' | 'tolerable';
export type Classification = { urgency: Urgency; reason: string };
export type UrgencyDecision = Classification & { impactConfirmed: boolean };
export type Classify = (answer: string) => Promise<Classification>;

export function impactQuestionEvent(readings: ImpactReadings): ProgressEvent {
  const text = requireMeasured(impactQuestionText(readings), readings);
  const payload = {
    questionId: IMPACT_QUESTION_ID,
    text,
    whyItMatters: 'Your answer is recorded in the report as the urgency for choosing a fix.',
    meanwhile: 'I keep gathering evidence.',
    blocks: 'none',
  };
  return { type: 'question_asked', summary: text, refs: [IMPACT_QUESTION_ID, ...evidenceIdsOf(readings)], payload };
}

export async function decideUrgency(answer: Answer | null, classify: Classify): Promise<UrgencyDecision> {
  if (answer === null) return { urgency: 'rush', reason: 'No answer arrived in time.', impactConfirmed: false };
  if (answer.text.trim() === I_DO_NOT_KNOW) return { urgency: 'rush', reason: 'The impact is not known.', impactConfirmed: false };
  return { ...(await classify(answer.text)), impactConfirmed: true };
}

export const STOPS_HERE = 'This run stops here: no further checks, mitigation or verification run in this version.';

export function pathSentence(decision: UrgencyDecision): string {
  const choice = decision.urgency === 'tolerable' ? 'Treated as tolerable for now.' : 'Treated as urgent.';
  return `${choice} ${STOPS_HERE}`;
}
