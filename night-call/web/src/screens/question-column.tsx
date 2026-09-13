import type { SubmitAnswer } from '../api/client';
import type { Question, SuppliedContext } from '../api/contract';
import { latestAnswer } from '../format/next-step';
import { formatAgo } from '../format/time';
import { useNow } from '../format/use-now';
import { QuestionCard } from '../kit';
import { PublicAnswer } from './accepted-answer';
import { OperatorQuestion } from './operator-question';

type QuestionColumnProps = {
  questions: Question[];
  context: SuppliedContext[];
  isOperator: boolean;
  submitAnswer: SubmitAnswer;
};

export function QuestionColumn({ questions, context, isOperator, submitAnswer }: QuestionColumnProps) {
  const openCount = questions.filter((question) => !question.answer).length;
  return (
    <div className="question-column">
      <div className="section-head">
        <span className="eyebrow">Questions</span>
        <span className="meta">{openCount} open</span>
      </div>
      {questions.length === 0 && <p className="muted">No questions from the lead yet.</p>}
      {questions.map((question) =>
        isOperator ? (
          <OperatorQuestion key={question.id} question={question} context={context} submitAnswer={submitAnswer} />
        ) : (
          <PublicQuestion key={question.id} question={question} context={context} />
        ),
      )}
    </div>
  );
}

function PublicQuestion({ question, context }: { question: Question; context: SuppliedContext[] }) {
  const now = useNow();
  const answer = latestAnswer(question, context);
  return (
    <QuestionCard
      question={question.text}
      why={question.whyItMatters}
      meanwhile={question.meanwhile}
      asked={`asked ${formatAgo(question.askedAt, now)}`}
      answered={Boolean(answer)}
      answer={answer && <PublicAnswer questionId={question.id} text={answer.text} />}
      readOnly
    />
  );
}
