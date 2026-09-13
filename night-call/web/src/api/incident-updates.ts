import type { IncidentEvent, Snapshot } from './contract';
import { fetchSnapshot } from './client';
import { followEventStream } from './event-stream';

export const USE_POLLING = false;
export const POLL_EVERY_MS = 3_000;

export type UpdateHandlers = {
  onEvent: (event: IncidentEvent) => void;
  onSnapshot: (snapshot: Snapshot) => void;
  onOpen: () => void;
  onLost: () => void;
};

export function startIncidentUpdates(incidentId: string, handlers: UpdateHandlers): () => void {
  return USE_POLLING ? pollSnapshot(incidentId, handlers) : followEventStream(incidentId, handlers);
}

function pollSnapshot(incidentId: string, handlers: UpdateHandlers): () => void {
  const readOnce = () =>
    fetchSnapshot(incidentId)
      .then((snapshot) => {
        handlers.onOpen();
        handlers.onSnapshot(snapshot);
      })
      .catch(handlers.onLost);
  readOnce();
  const timer = window.setInterval(readOnce, POLL_EVERY_MS);
  return () => window.clearInterval(timer);
}
