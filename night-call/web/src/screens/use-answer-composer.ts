import { useCallback, useRef, useState } from 'react';
import type { SubmitAnswer } from '../api/client';

export type ComposerStatus = 'editing' | 'pending' | 'accepted' | 'failed';

type Attempt = { text: string; idempotencyKey: string };
type ComposerTarget = { questionId: string; submitAnswer: SubmitAnswer };

export function makeIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function attemptFor(previous: Attempt | null, text: string): Attempt {
  if (previous && previous.text === text) return previous;
  return { text, idempotencyKey: makeIdempotencyKey() };
}

function useAnswerSender({ questionId, submitAnswer }: ComposerTarget) {
  const [status, setStatus] = useState<ComposerStatus>('editing');
  const [sentText, setSentText] = useState('');
  const lastAttempt = useRef<Attempt | null>(null);
  const send = useCallback(
    async (text: string) => {
      const attempt = attemptFor(lastAttempt.current, text.trim());
      lastAttempt.current = attempt;
      setSentText(attempt.text);
      setStatus('pending');
      const isAccepted = await submitAnswer({ questionId, ...attempt }).then(() => true, () => false);
      if (isAccepted) lastAttempt.current = null;
      setStatus(isAccepted ? 'accepted' : 'failed');
    },
    [questionId, submitAnswer],
  );
  return { status, sentText, send, retry: () => send(sentText) };
}

export function useAnswerComposer(target: ComposerTarget) {
  const [draft, setDraft] = useState('');
  const sender = useAnswerSender(target);
  return { ...sender, draft, setDraft };
}

export type AnswerComposerState = ReturnType<typeof useAnswerComposer>;
