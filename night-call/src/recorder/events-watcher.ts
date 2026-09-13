import { productionEventOf, splitLines } from './docker-event-line';
import type { EventsBuffer } from './events-buffer';

export type EventsConnection = (sinceSeconds: number) => Promise<NodeJS.ReadableStream>;

export type WatchSetup = { buffer: EventsBuffer; connect: EventsConnection; retryMs: number };

type WatchState = WatchSetup & { stopped: boolean; stream: NodeJS.ReadableStream | null };

const STARTUP_LOOKBACK_SECONDS = 30 * 60;

function chunkReader(buffer: EventsBuffer): (chunk: Buffer | string) => void {
  let rest = '';
  return (chunk) => {
    const split = splitLines(rest + chunk.toString());
    rest = split.rest;
    for (const event of split.lines.map(productionEventOf)) if (event) buffer.add(event);
  };
}

function reconnectOnce(state: WatchState): () => void {
  let scheduled = false;
  return () => {
    if (scheduled || state.stopped) return;
    scheduled = true;
    setTimeout(() => void connectFrom(state), state.retryMs).unref();
  };
}

async function connectFrom(state: WatchState): Promise<void> {
  const reconnect = reconnectOnce(state);
  const since = state.buffer.latestSeconds() ?? Math.floor(Date.now() / 1000) - STARTUP_LOOKBACK_SECONDS;
  try {
    const stream = await state.connect(since);
    state.stream = stream;
    stream.on('data', chunkReader(state.buffer));
    stream.once('end', reconnect);
    stream.once('error', reconnect);
  } catch {
    reconnect();
  }
}

export function watchProductionEvents(setup: WatchSetup): () => void {
  const state: WatchState = { ...setup, stopped: false, stream: null };
  void connectFrom(state);
  return () => {
    state.stopped = true;
    (state.stream as { destroy?: () => void } | null)?.destroy?.();
  };
}
