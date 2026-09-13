import { unwatchFile, watchFile } from 'node:fs';

import { readLog } from '../investigation/event-lines';
import type { IncidentEvent } from '../investigation/event-types';
import { eventsPath, incidentFolder } from '../investigation/incident-paths';
import { resumeAfter } from './resume-point';
import type { StreamConnection, StreamResponse, StreamSource } from './stream-connection';
import { StreamCursor } from './stream-cursor';

const PING_MS = 15_000;
const FILE_CHECK_MS = 1_000;

function startResponse(response: StreamResponse): void {
  response.status(200);
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no');
  response.flushHeaders();
}

function sendTo(response: StreamResponse): (event: IncidentEvent) => void {
  return (event) => response.write(`id: ${event.sequence}\ndata: ${JSON.stringify(event)}\n\n`);
}

export function streamEvents(connection: StreamConnection, source: StreamSource): void {
  const { request, response } = connection;
  startResponse(response);
  const cursor = new StreamCursor(resumeAfter(request), sendTo(response));
  const unsubscribe = source.stream.subscribe(source.incidentId, (event) => cursor.offer(event));
  const folder = incidentFolder(source.stateDir, source.incidentId);
  const catchUp = () => readLog(folder).events.forEach((event) => cursor.offer(event));
  catchUp();
  watchFile(eventsPath(folder), { interval: FILE_CHECK_MS }, catchUp);
  const ping = setInterval(() => response.write(': ping\n\n'), PING_MS);
  request.on('close', () => {
    clearInterval(ping);
    unsubscribe();
    unwatchFile(eventsPath(folder), catchUp);
  });
}
