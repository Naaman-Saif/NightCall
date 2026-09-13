import type { SubmitAnswer } from '../api/client';
import { I_DO_NOT_KNOW } from '../format/next-step';
import { Button, Textarea } from '../kit';
import { AcceptedAnswer } from './accepted-answer';
import { useAnswerComposer, type AnswerComposerState } from './use-answer-composer';

const NOT_SAVED_MESSAGE = 'Not saved. Your draft is kept. Retry sends the same answer with the same key.';
const PUBLIC_ANSWER_HINT = 'Answers are shown on the public incident page.';

export function AnswerComposer({ questionId, submitAnswer }: { questionId: string; submitAnswer: SubmitAnswer }) {
  const composer = useAnswerComposer({ questionId, submitAnswer });
  if (composer.status === 'accepted') return <AcceptedAnswer questionId={questionId} text={composer.sentText} />;
  return (
    <div className="answer-composer">
      <Textarea
        rows={2}
        aria-label="Your answer"
        placeholder="Answer in one line if you can"
        value={composer.draft}
        disabled={composer.status === 'pending'}
        onChange={(event) => composer.setDraft(event.target.value)}
        hint={PUBLIC_ANSWER_HINT}
        error={composer.status === 'failed' ? NOT_SAVED_MESSAGE : undefined}
      />
      <ComposerButtons composer={composer} />
    </div>
  );
}

function ComposerButtons({ composer }: { composer: AnswerComposerState }) {
  const isPending = composer.status === 'pending';
  const hasDraft = composer.draft.trim().length > 0;
  return (
    <div className="composer-buttons">
      <Button size="sm" variant="primary" icon="send" loading={isPending} disabled={!hasDraft} onClick={() => composer.send(composer.draft)}>
        Send answer
      </Button>
      <Button size="sm" variant="ghost" disabled={isPending} onClick={() => composer.send(I_DO_NOT_KNOW)}>
        {I_DO_NOT_KNOW}
      </Button>
      {composer.status === 'failed' && (
        <Button size="sm" icon="refresh-cw" onClick={composer.retry}>
          Retry
        </Button>
      )}
    </div>
  );
}
