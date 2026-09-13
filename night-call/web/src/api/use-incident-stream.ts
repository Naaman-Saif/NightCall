import { useEffect, useReducer, useState } from 'react';
import type { IncidentEvent, Snapshot } from './contract';
import { fetchSnapshot } from './client';
import { startIncidentUpdates } from './incident-updates';
import { useConnectionState, type ConnectionState } from './use-connection-state';

export type IncidentView = {
  snapshot: Snapshot | null;
  events: IncidentEvent[];
  connection: ConnectionState;
  loadFailed: boolean;
};

type SnapshotHandlers = { onSnapshot: (snapshot: Snapshot) => void; onFailure: () => void };

export function addToTimeline(events: IncidentEvent[], event: IncidentEvent): IncidentEvent[] {
  if (events.some((known) => known.sequence === event.sequence)) return events;
  return [...events, event].sort((first, second) => first.sequence - second.sequence);
}

function createSnapshotLoader(incidentId: string, handlers: SnapshotHandlers) {
  const loader = { running: false, requestedAgain: false };
  return async function loadSnapshot() {
    if (loader.running) {
      loader.requestedAgain = true;
      return;
    }
    loader.running = true;
    do {
      loader.requestedAgain = false;
      await fetchSnapshot(incidentId).then(handlers.onSnapshot, handlers.onFailure);
    } while (loader.requestedAgain);
    loader.running = false;
  };
}

export const REFRESH_SNAPSHOT_EVERY_MS = 30_000;

function withSnapshotRefresh(loadSnapshot: () => void, stopUpdates: () => void): () => void {
  const timer = window.setInterval(loadSnapshot, REFRESH_SNAPSHOT_EVERY_MS);
  return () => {
    window.clearInterval(timer);
    stopUpdates();
  };
}

export function useIncidentStream(incidentId: string): IncidentView {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [events, addEvent] = useReducer(addToTimeline, []);
  const { state, markOpen, markLost } = useConnectionState();
  useEffect(() => {
    const loadSnapshot = createSnapshotLoader(incidentId, { onSnapshot: setSnapshot, onFailure: () => setLoadFailed(true) });
    const onEvent = (event: IncidentEvent) => {
      addEvent(event);
      loadSnapshot();
    };
    const onOpen = () => {
      markOpen();
      loadSnapshot();
    };
    loadSnapshot();
    return withSnapshotRefresh(loadSnapshot, startIncidentUpdates(incidentId, { onEvent, onSnapshot: setSnapshot, onOpen, onLost: markLost }));
  }, [incidentId, markOpen, markLost]);
  return { snapshot, events, connection: state, loadFailed: loadFailed && !snapshot };
}
