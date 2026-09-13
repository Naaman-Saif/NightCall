import type { SubmitAnswer } from '../api/client';
import type { Question, SuppliedContext } from '../api/contract';
import { acceptsAnotherAnswer, latestAnswer } from '../format/next-step';
import { formatAgo } from '../format/time';
import { useNow } from '../format/use-now';
import { Badge, RoleTag } from '../kit';
import { AcceptedAnswer } from './accepted-answer';
import { AnswerComposer } from './answer-composer';

type OperatorQuestionProps = { question: Question; context: SuppliedContext[]; submitAnswer: SubmitAnswer };

export function OperatorQuestion({ question, context, submitAnswer }: OperatorQuestionProps) {
  const answer = latestAnswer(question, context);
  return (
    <article className="question-card" data-answered={Boolean(answer)} data-question={question.id}>
      <QuestionText question={question} />
      {answer && <AcceptedAnswer questionId={question.id} text={answer.text} />}
      {acceptsAnotherAnswer(answer) && (
        <AnswerComposer key={answer?.suppliedAt ?? 'first'} questionId={question.id} submitAnswer={submitAnswer} />
      )}
    </article>
  );
}

function QuestionText({ question }: { question: Question }) {
  const now = useNow();
  return (
    <>
      <div className="question-meta">
        <RoleTag role="lead" />
        <span className="meta">asked {formatAgo(question.askedAt, now)}</span>
        {question.blocks === 'mitigation' && <Badge>Mitigation waits on this</Badge>}
      </div>
      <p className="question-text">{question.text}</p>
      <p className="question-why">{question.whyItMatters}</p>
      <p className="meta">Meanwhile: {question.meanwhile}</p>
    </>
  );
}
