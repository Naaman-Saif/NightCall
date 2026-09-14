import type { Question } from '../api/contract';
import { Goose } from '../brand/goose';
import { formatAgo } from '../format/time';
import { useNow } from '../format/use-now';
import { Badge } from '../kit';

export function QuestionHeading({ question, needsAttention }: { question: Question; needsAttention?: boolean }) {
  const attentionKey = needsAttention ? `${question.askedAt}:${question.id}` : undefined;
  return (
    <div className="question-intro">
      <Goose attentionKey={attentionKey} />
      <QuestionText question={question} />
    </div>
  );
}

function QuestionText({ question }: { question: Question }) {
  const now = useNow();
  return (
    <div className="question-copy">
      <div className="question-meta">
        <span className="meta">asked {formatAgo(question.askedAt, now)}</span>
        {question.blocks === 'mitigation' && <Badge>Mitigation waits on this</Badge>}
      </div>
      <p className="question-text">{question.text}</p>
      <p className="question-why">{question.whyItMatters}</p>
      <p className="meta">Meanwhile: {question.meanwhile}</p>
    </div>
  );
}
