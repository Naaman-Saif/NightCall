import type { IncidentEvent } from './event-types';
import { payloadOf } from './payload-schemas';
import { reducerFrom } from './reducer';
import type { Attention, Question, Snapshot } from './snapshot';

function askQuestion(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { questionId, text, whyItMatters, meanwhile, blocks } = payloadOf(event, 'question_asked');
  const question = { id: questionId, text, whyItMatters, meanwhile, blocks, askedAt: event.occurredAt, answer: null };
  return { ...snapshot, questions: [...snapshot.questions, question] };
}

function supplyContext(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { questionId, text } = payloadOf(event, 'context_supplied');
  const answer = { text, suppliedAt: event.occurredAt };
  const questions = snapshot.questions.map((question) =>
    question.id === questionId && question.answer === null ? { ...question, answer } : question,
  );
  const context = [...snapshot.context, { questionId, text, suppliedAt: event.occurredAt }];
  return { ...snapshot, questions, context };
}

const handleEvent = reducerFrom({ question_asked: askQuestion, context_supplied: supplyContext });

function attentionFor(questions: Question[]): Attention {
  const open = questions.filter((question) => question.answer === null);
  if (open.some((question) => question.blocks === 'mitigation')) return 'blocked';
  return open.length > 0 ? 'context_requested' : 'none';
}

export function reduceQuestions(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const handled = handleEvent(snapshot, event);
  const incident = { ...handled.incident, attention: attentionFor(handled.questions) };
  return { ...handled, incident };
}
