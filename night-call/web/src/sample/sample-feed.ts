import type { Actor, EventType, IncidentEvent } from '../api/contract';

export const SAMPLE_INCIDENT_ID = 'sample';
const SAMPLE_FILE_URL = '/fixtures/sample-incident.json';
const INVESTIGATION_BUDGET_MS = 30 * 60 * 1000;

export type EventDraft = {
  actor: Actor;
  type: EventType;
  summary: string;
  refs: string[];
  payload: Record<string, unknown>;
};

type SampleStep = EventDraft & { delayMs: number };

type Feed = { sequence: number; timers: number[]; isStopped: boolean; onEvent: (event: IncidentEvent) => void };

export function startSampleFeed(onEvent: (event: IncidentEvent) => void) {
  const feed: Feed = { sequence: 0, timers: [], isStopped: false, onEvent };
  fetch(SAMPLE_FILE_URL)
    .then((response) => response.json() as Promise<{ events: SampleStep[] }>)
    .then((file) => scheduleSteps(feed, file.events))
    .catch(() => undefined);
  const stop = () => {
    feed.isStopped = true;
    feed.timers.forEach((timer) => window.clearTimeout(timer));
  };
  return { stop, publish: (draft: EventDraft) => publishDraft(feed, draft) };
}

function scheduleSteps(feed: Feed, steps: SampleStep[]) {
  if (feed.isStopped) return;
  let waitMs = 0;
  for (const step of steps) {
    waitMs += step.delayMs;
    feed.timers.push(window.setTimeout(() => publishDraft(feed, step), waitMs));
  }
}

function publishDraft(feed: Feed, draft: EventDraft) {
  feed.sequence += 1;
  const event = {
    id: `sample-${feed.sequence}`,
    incidentId: SAMPLE_INCIDENT_ID,
    sequence: feed.sequence,
    occurredAt: new Date().toISOString(),
    actor: draft.actor,
    type: draft.type,
    summary: draft.summary,
    refs: draft.refs,
    payload: withRealTimes(draft),
  };
  feed.onEvent(event as unknown as IncidentEvent);
}

function withRealTimes(draft: EventDraft): Record<string, unknown> {
  if (draft.type !== 'alert_received') return draft.payload;
  const now = Date.now();
  const startedAt = new Date(now).toISOString();
  const deadlineAt = new Date(now + INVESTIGATION_BUDGET_MS).toISOString();
  return { ...draft.payload, startedAt, deadlineAt };
}
