import type { Answer, Question, SuppliedContext } from '../api/contract';

export const I_DO_NOT_KNOW = "I don't know";

const IMPACT_QUESTION_ID = 'q-impact';
const LEAD_ADJUSTS_PLAN = 'Saved. NightCall reads this next and adjusts the plan.';
const IMPACT_TREATED_AS_URGENT =
  'Saved. NightCall treats the impact as urgent and goes for the safest fix. Answer again anytime to change that.';

export function isUnknownAnswer(text: string): boolean {
  return text.trim().toLowerCase() === I_DO_NOT_KNOW.toLowerCase();
}

export function describeNextStep(questionId: string, answerText: string): string {
  if (questionId === IMPACT_QUESTION_ID && isUnknownAnswer(answerText)) return IMPACT_TREATED_AS_URGENT;
  return LEAD_ADJUSTS_PLAN;
}

export function acceptsAnotherAnswer(answer: Answer | null): boolean {
  return !answer || isUnknownAnswer(answer.text);
}

export function latestAnswer(question: Question, context: SuppliedContext[]): Answer | null {
  const suppliedForQuestion = context.filter((item) => item.questionId === question.id);
  const newest = suppliedForQuestion[suppliedForQuestion.length - 1];
  if (!newest) return question.answer;
  return { text: newest.text, suppliedAt: newest.suppliedAt };
}
