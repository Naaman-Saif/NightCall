import type { LiveStream } from '../investigation/live-stream';

export type StreamRequest = {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
  params: Record<string, string>;
  on(event: 'close', listener: () => void): unknown;
};

export type StreamResponse = {
  status(code: number): unknown;
  setHeader(name: string, value: string): unknown;
  flushHeaders(): void;
  write(chunk: string): boolean;
};

export type StreamConnection = { request: StreamRequest; response: StreamResponse };

export type StreamSource = { stateDir: string; stream: LiveStream; incidentId: string };
