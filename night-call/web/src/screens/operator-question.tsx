import type { SubmitAnswer } from '../api/client';
import type { Question } from '../api/contract';
import { formatAgo } from '../format/time';
import { useNow } from '../format/use-now';
import { Badge, RoleTag } from '../kit';
import { AnswerComposer } from './answer-composer';

export function OperatorQuestion({ question, submitAnswer }: { question: Question; submitAnswer: SubmitAnswer }) {
  const now = useNow();
  return (
    <article className="question-card" data-answered={Boolean(question.answer)}>
      <div className="question-meta">
        <RoleTag role="lead" />
        <span className="meta">asked {formatAgo(question.askedAt, now)}</span>
        {question.blocks === 'mitigation' && <Badge>Mitigation waits on this</Badge>}
      </div>
      <p className="question-text">{question.text}</p>
      <p className="question-why">{question.whyItMatters}</p>
      <p className="meta">Meanwhile: {question.meanwhile}</p>
      {question.answer ? (
        <AcceptedAnswer text={question.answer.text} />
      ) : (
        <AnswerComposer questionId={question.id} submitAnswer={submitAnswer} />
      )}
    </article>
  );
}

export function AcceptedAnswer({ text }: { text: string }) {
  return (
    <div className="answer-accepted" role="status">
      <Badge tone="verified" icon="check">Answer accepted</Badge>
      {text && <p className="answer-text">{text}</p>}
    </div>
  );
}
