import { readLog } from './event-lines';
import type { IncidentEvent } from './event-types';
import { incidentFolder } from './incident-paths';
import type { LiveStream } from './live-stream';
import { payloadOf } from './payload-schemas';

export type ContextAnswer = { sequence: number; questionId: string | null; text: string; suppliedAt: string };

export type ContextWait = {
  stateDir: string;
  stream: LiveStream;
  incidentId: string;
  after: number;
  waitSeconds: number;
  stop: AbortSignal;
};

export function answersAfter(events: IncidentEvent[], after: number): ContextAnswer[] {
  return events
    .filter((event) => event.type === 'context_supplied' && event.sequence > after)
    .map((event) => {
      const { questionId, text } = payloadOf(event, 'context_supplied');
      return { sequence: event.sequence, questionId, text, suppliedAt: event.occurredAt };
    });
}

function storedAnswers(wait: ContextWait): ContextAnswer[] {
  return answersAfter(readLog(incidentFolder(wait.stateDir, wait.incidentId)).events, wait.after);
}

function answersArriving(wait: ContextWait): Promise<ContextAnswer[]> {
  return new Promise((resolve) => {
    const finish = (answers: ContextAnswer[]) => {
      clearTimeout(timer);
      unsubscribe();
      wait.stop.removeEventListener('abort', stopped);
      resolve(answers);
    };
    const stopped = () => finish([]);
    const unsubscribe = wait.stream.subscribe(wait.incidentId, (event) => {
      if (event.type === 'context_supplied' && event.sequence > wait.after) finish(storedAnswers(wait));
    });
    const timer = setTimeout(stopped, wait.waitSeconds * 1000);
    wait.stop.addEventListener('abort', stopped);
  });
}

export async function waitForAnswers(wait: ContextWait): Promise<ContextAnswer[]> {
  const current = storedAnswers(wait);
  if (current.length > 0 || wait.waitSeconds === 0) return current;
  return answersArriving(wait);
}
