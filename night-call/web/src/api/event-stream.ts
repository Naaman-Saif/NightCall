import { EVENT_TYPES, type IncidentEvent } from './contract';
import { eventStreamUrl } from './client';
import type { UpdateHandlers } from './incident-updates';

export const REOPEN_STREAM_AFTER_MS = 3_000;

type Stream = {
  incidentId: string;
  handlers: UpdateHandlers;
  source: EventSource | null;
  lastSequence: number;
  reopenTimer: number;
};

export function followEventStream(incidentId: string, handlers: UpdateHandlers): () => void {
  const stream: Stream = { incidentId, handlers, source: null, lastSequence: 0, reopenTimer: 0 };
  openStream(stream);
  return () => closeStream(stream);
}

function openStream(stream: Stream) {
  const source = new EventSource(eventStreamUrl(stream.incidentId, stream.lastSequence));
  const receive = (message: MessageEvent<string>) => receiveEvent(stream, message);
  source.onopen = stream.handlers.onOpen;
  source.onerror = () => reopenWhenClosed(stream);
  ['message', ...EVENT_TYPES].forEach((type) => source.addEventListener(type, receive as EventListener));
  stream.source = source;
}

function receiveEvent(stream: Stream, message: MessageEvent<string>) {
  const event = JSON.parse(message.data) as IncidentEvent;
  stream.lastSequence = Math.max(stream.lastSequence, event.sequence);
  stream.handlers.onEvent(event);
}

function reopenWhenClosed(stream: Stream) {
  stream.handlers.onLost();
  if (stream.source?.readyState !== EventSource.CLOSED) return;
  stream.reopenTimer = window.setTimeout(() => openStream(stream), REOPEN_STREAM_AFTER_MS);
}

function closeStream(stream: Stream) {
  window.clearTimeout(stream.reopenTimer);
  stream.source?.close();
}
