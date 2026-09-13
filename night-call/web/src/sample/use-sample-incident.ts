import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ContextAnswer, SubmitAnswer } from '../api/client';
import { addToTimeline, type IncidentView } from '../api/use-incident-stream';
import { startSampleFeed, type EventDraft } from './sample-feed';
import { reduceSample } from './reduce-sample';

type SampleFeed = ReturnType<typeof startSampleFeed>;

function operatorAnswer(answer: ContextAnswer): EventDraft {
  return {
    actor: 'operator',
    type: 'context_supplied',
    summary: `Operator: ${answer.text}`,
    refs: answer.questionId ? [answer.questionId] : [],
    payload: { illustrative: true, ...answer },
  };
}

export function useSampleIncident(): { view: IncidentView; submitAnswer: SubmitAnswer } {
  const [events, addEvent] = useReducer(addToTimeline, []);
  const feed = useRef<SampleFeed | null>(null);
  useEffect(() => {
    feed.current = startSampleFeed(addEvent);
    return () => feed.current?.stop();
  }, []);
  const snapshot = useMemo(() => reduceSample(events), [events]);
  const submitAnswer = useCallback(async (answer: ContextAnswer) => {
    feed.current?.publish(operatorAnswer(answer));
  }, []);
  const view: IncidentView = { snapshot, events, connection: 'live', loadFailed: false };
  return { view, submitAnswer };
}
