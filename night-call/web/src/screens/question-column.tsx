import type { SubmitAnswer } from '../api/client';
import type { Question } from '../api/contract';
import { formatAgo } from '../format/time';
import { useNow } from '../format/use-now';
import { QuestionCard } from '../kit';
import { OperatorQuestion } from './operator-question';

type QuestionColumnProps = { questions: Question[]; isOperator: boolean; submitAnswer: SubmitAnswer };

export function QuestionColumn({ questions, isOperator, submitAnswer }: QuestionColumnProps) {
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
          <OperatorQuestion key={question.id} question={question} submitAnswer={submitAnswer} />
        ) : (
          <PublicQuestion key={question.id} question={question} />
        ),
      )}
    </div>
  );
}

function PublicQuestion({ question }: { question: Question }) {
  const now = useNow();
  return (
    <QuestionCard
      question={question.text}
      why={question.whyItMatters}
      meanwhile={question.meanwhile}
      asked={`asked ${formatAgo(question.askedAt, now)}`}
      answered={Boolean(question.answer)}
      answer={question.answer?.text}
      readOnly
    />
  );
}
