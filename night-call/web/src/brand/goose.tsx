import { useEffect, useState } from 'react';
import { useMascotMotion } from './mascot-motion';
import './goose.css';

const greetedQuestions = new Set<string>();
type GooseProps = { attentionKey?: string; size?: 'small' | 'large' };

function rememberQuestion(key: string) {
  greetedQuestions.add(key);
  if (greetedQuestions.size > 200) greetedQuestions.delete(greetedQuestions.values().next().value!);
}

function useWingRaise(attentionKey: string | undefined, enabled: boolean) {
  const [wavingFor, setWavingFor] = useState<string>();
  useEffect(() => {
    if (!attentionKey) return;
    if (!enabled) {
      rememberQuestion(attentionKey);
      setWavingFor(undefined);
      return;
    }
    if (greetedQuestions.has(attentionKey)) return;
    rememberQuestion(attentionKey);
    setWavingFor(attentionKey);
  }, [attentionKey, enabled]);
  return { waving: Boolean(attentionKey && wavingFor === attentionKey), finish: () => setWavingFor(undefined) };
}

export function Goose({ attentionKey, size = 'small' }: GooseProps) {
  const { enabled } = useMascotMotion();
  const { waving, finish } = useWingRaise(attentionKey, enabled);
  const motion = enabled ? (waving ? 'wave' : 'idle') : 'still';
  return <span className="nightcall-goose" data-size={size} data-motion={motion} onAnimationEnd={finish} aria-hidden="true" />;
}
