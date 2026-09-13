import type { Attention, IncidentEvent, Question, Snapshot } from '../api/contract';
import { reducerFrom } from './reducer-table';

export function withQuestion(snapshot: Snapshot, event: IncidentEvent<'question_asked'>): Snapshot {
  const { questionId, text, whyItMatters, meanwhile, blocks } = event.payload;
  const question: Question = { id: questionId, text, whyItMatters, meanwhile, blocks, askedAt: event.occurredAt, answer: null };
  return { ...snapshot, questions: [...snapshot.questions, question] };
}

export function withContext(snapshot: Snapshot, event: IncidentEvent<'context_supplied'>): Snapshot {
  const { questionId, text } = event.payload;
  const answer = { text, suppliedAt: event.occurredAt };
  const questions = snapshot.questions.map((question) => (question.id === questionId ? { ...question, answer } : question));
  const context = [...snapshot.context, { questionId, text, suppliedAt: event.occurredAt }];
  return { ...snapshot, questions, context };
}

export const reduceQuestions = reducerFrom({ question_asked: withQuestion, context_supplied: withContext });

export function attentionFor(snapshot: Snapshot): Attention {
  const openQuestions = snapshot.questions.filter((question) => !question.answer);
  if (openQuestions.some((question) => question.blocks === 'mitigation')) return 'blocked';
  return openQuestions.length > 0 ? 'context_requested' : 'none';
}
