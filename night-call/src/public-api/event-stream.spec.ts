import { EventEmitter } from 'node:events';

import { readLog } from '../investigation/event-lines';
import { incidentFolder } from '../investigation/incident-paths';
import { LiveStream } from '../investigation/live-stream';
import { appendAsRole } from '../investigation/role-append';
import { freshWriter, openIncident, toolBody } from '../investigation/writer.fixture';
import { streamEvents } from './event-stream';
import { resumeAfter } from './resume-point';
import type { StreamRequest } from './stream-connection';

function fakeConnection(headers: Record<string, string>, query: Record<string, string>) {
  const request = Object.assign(new EventEmitter(), { headers, query, params: {} });
  const chunks: string[] = [];
  const headersSent: Record<string, string> = {};
  const response = {
    status: () => response,
    setHeader: (name: string, value: string) => (headersSent[name] = value),
    flushHeaders: () => undefined,
    write: (chunk: string) => chunks.push(chunk) > 0,
  };
  return { request, response, chunks, headersSent };
}

function sentSequences(chunks: string[]): number[] {
  return chunks.map((chunk) => /^id: (\d+)/.exec(chunk)?.[1]).filter(Boolean).map(Number);
}

const work = toolBody('role_status_changed', { role: 'lead', status: 'working', assignment: 'x' });

describe('event stream', () => {
  it('replays after the resume point, then streams live events without duplicates', async () => {
    const stream = new LiveStream();
    const writer = freshWriter(stream);
    const incidentId = await openIncident(writer);
    for (let step = 0; step < 3; step += 1) await appendAsRole(writer, { role: 'lead', incidentId, body: work });
    const connection = fakeConnection({ 'last-event-id': '2' }, { after: '0' });
    streamEvents(connection, { stateDir: writer.stateDir, stream, incidentId });
    stream.publish(readLog(incidentFolder(writer.stateDir, incidentId)).events[3]);
    await appendAsRole(writer, { role: 'lead', incidentId, body: work });
    connection.request.emit('close');
    await appendAsRole(writer, { role: 'lead', incidentId, body: work });
    expect(sentSequences(connection.chunks)).toEqual([3, 4, 5]);
    expect(connection.headersSent['Cache-Control']).toBe('no-cache, no-transform');
  });

  it('lets Last-Event-ID win over the after query', () => {
    const request = (headers: Record<string, string>, query: Record<string, string>) =>
      ({ headers, query, params: {}, on: () => undefined }) as StreamRequest;
    expect(resumeAfter(request({ 'last-event-id': '2' }, { after: '7' }))).toBe(2);
    expect(resumeAfter(request({}, { after: '7' }))).toBe(7);
    expect(resumeAfter(request({ 'last-event-id': 'junk' }, {}))).toBe(0);
  });
});
