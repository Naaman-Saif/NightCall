import type { SubmitAnswer } from '../api/client';
import type { Question, SuppliedContext } from '../api/contract';
import { acceptsAnotherAnswer, latestAnswer } from '../format/next-step';
import { AcceptedAnswer, PublicAnswer } from './accepted-answer';
import { AnswerComposer } from './answer-composer';
import { QuestionHeading } from './question-heading';

type QuestionProps = { question: Question; context: SuppliedContext[] };
type OperatorQuestionProps = QuestionProps & { submitAnswer: SubmitAnswer; isActive: boolean };

export function OperatorQuestion({ question, context, submitAnswer, isActive }: OperatorQuestionProps) {
  const answer = latestAnswer(question, context);
  return (
    <article className="question-card" data-answered={Boolean(answer)} data-question={question.id}>
      <QuestionHeading question={question} needsAttention={isActive && !answer && question.status !== 'no_answer' && question.status !== 'answered'} />
      {answer && <AcceptedAnswer questionId={question.id} text={answer.text} />}
      {question.status === 'no_answer' && <p className="meta">No answer. The run finished without one.</p>}
      {question.status !== 'no_answer' && acceptsAnotherAnswer(answer) && (
        <AnswerComposer key={answer?.suppliedAt ?? 'first'} questionId={question.id} submitAnswer={submitAnswer} />
      )}
    </article>
  );
}

export function PublicQuestion({ question, context }: QuestionProps) {
  const answer = latestAnswer(question, context);
  return (
    <article className="question-card" data-answered={Boolean(answer)} data-question={question.id}>
      <QuestionHeading question={question} />
      {answer ? (
        <PublicAnswer questionId={question.id} text={answer.text} />
      ) : (
        <p className="meta">{question.status === 'no_answer' ? 'No answer. The run finished without one.' : 'Waiting for the operator to answer.'}</p>
      )}
    </article>
  );
}
