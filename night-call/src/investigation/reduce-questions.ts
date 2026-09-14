import type { IncidentEvent } from './event-types';
import { payloadOf } from './payload-schemas';
import { reducerFrom } from './reducer';
import type { Attention, Question, Snapshot } from './snapshot';

function askQuestion(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { questionId, text, whyItMatters, meanwhile, blocks } = payloadOf(event, 'question_asked');
  const question: Question = { id: questionId, text, whyItMatters, meanwhile, blocks, askedAt: event.occurredAt, answer: null, status: 'waiting' };
  return { ...snapshot, questions: [...snapshot.questions, question] };
}

function supplyContext(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { questionId, text } = payloadOf(event, 'context_supplied');
  const answer = { text, suppliedAt: event.occurredAt };
  const questions = snapshot.questions.map((question) =>
    question.id === questionId ? { ...question, answer } : question,
  );
  const context = [...snapshot.context, { questionId, text, suppliedAt: event.occurredAt }];
  return { ...snapshot, questions, context };
}

const handleEvent = reducerFrom({ question_asked: askQuestion, context_supplied: supplyContext });

function withStatus(questions: Question[], finished: boolean): Question[] {
  return questions.map((question) => {
    if (question.answer !== null) return { ...question, status: 'answered' as const };
    return { ...question, status: finished ? ('no_answer' as const) : ('waiting' as const) };
  });
}

function attentionFor(questions: Question[], finished: boolean): Attention {
  const open = questions.filter((question) => question.answer === null);
  if (finished) return open.length > 0 ? 'no_answer' : 'none';
  if (open.some((question) => question.blocks === 'mitigation')) return 'blocked';
  return open.length > 0 ? 'context_requested' : 'none';
}

export function reduceQuestions(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const handled = handleEvent(snapshot, event);
  const finished = handled.incident.lifecycle === 'finished';
  const questions = withStatus(handled.questions, finished);
  const incident = { ...handled.incident, attention: attentionFor(questions, finished) };
  return { ...handled, questions, incident };
}
