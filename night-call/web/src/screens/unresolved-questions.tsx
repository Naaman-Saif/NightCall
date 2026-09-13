import type { SubmitAnswer } from '../api/client';
import type { Snapshot } from '../api/contract';
import { Card, Icon } from '../kit';
import { OperatorQuestion, PublicQuestion } from './operator-question';

type UnresolvedQuestionsProps = { snapshot: Snapshot; isOperator: boolean; submitAnswer: SubmitAnswer };

export function UnresolvedQuestions({ snapshot, isOperator, submitAnswer }: UnresolvedQuestionsProps) {
  const { questions, context } = snapshot;
  const openCount = questions.filter((question) => !question.answer).length;
  return (
    <Card title="Unresolved questions" actions={<span className="meta">{openCount} open</span>} className="section-questions">
      <div className="panel-stack">
        {questions.length === 0 && <p className="muted">No questions for the operator yet.</p>}
        {questions.map((question) =>
          isOperator ? (
            <OperatorQuestion key={question.id} question={question} context={context} submitAnswer={submitAnswer} />
          ) : (
            <PublicQuestion key={question.id} question={question} context={context} />
          ),
        )}
        <StillUnknown unknowns={snapshot.brief?.unknowns ?? []} />
      </div>
    </Card>
  );
}

function StillUnknown({ unknowns }: { unknowns: string[] }) {
  if (unknowns.length === 0) return null;
  return (
    <div>
      <div className="eyebrow">Still unknown</div>
      <ul className="brief-list">
        {unknowns.map((unknown) => (
          <li key={unknown}>
            <Icon name="circle-dashed" size={13} />
            {unknown}
          </li>
        ))}
      </ul>
    </div>
  );
}
