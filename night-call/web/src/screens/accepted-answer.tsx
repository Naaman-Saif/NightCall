import { describeNextStep } from '../format/next-step';
import { Badge } from '../kit';

export function AcceptedAnswer({ questionId, text }: { questionId: string; text: string }) {
  return (
    <div className="answer-accepted" role="status">
      <Badge tone="verified" icon="check">Answer accepted</Badge>
      <p className="answer-text">{text}</p>
      <p className="next-step-line">{describeNextStep(questionId, text)}</p>
    </div>
  );
}

export function PublicAnswer({ questionId, text }: { questionId: string; text: string }) {
  return (
    <>
      {text}
      <span className="next-step-line">{describeNextStep(questionId, text)}</span>
    </>
  );
}
