import { PassThrough } from 'node:stream';

import { EventsBuffer } from './events-buffer';
import { watchProductionEvents } from './events-watcher';

function dockerEvent(action: string, seconds: number): string {
  const Actor = { ID: 'abc', Attributes: { name: 'recommendation', 'com.docker.compose.service': 'recommendation', exitCode: '137' } };
  return `${JSON.stringify({ Type: 'container', Action: action, time: seconds, timeNano: seconds * 1e9, Actor })}\n`;
}

async function waitFor(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100 && !check(); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 5));
}

describe('production events', () => {
  it('buffers oom, die and start, ignores others and reconnects from the last event time', async () => {
    const buffer = new EventsBuffer();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const streams = [new PassThrough(), new PassThrough()];
    const sinceCalls: number[] = [];
    const connect = async (since: number) => {
      sinceCalls.push(since);
      return streams[sinceCalls.length - 1];
    };
    const stop = watchProductionEvents({ buffer, connect, retryMs: 1 });
    await waitFor(() => sinceCalls.length === 1);
    streams[0].write(dockerEvent('oom', nowSeconds - 5) + dockerEvent('exec_start', nowSeconds - 4));
    streams[0].write(dockerEvent('die', nowSeconds - 3).slice(0, 20));
    streams[0].write(dockerEvent('die', nowSeconds - 3).slice(20));
    streams[0].end();
    await waitFor(() => sinceCalls.length === 2);
    streams[1].write(dockerEvent('die', nowSeconds - 3) + dockerEvent('start', nowSeconds - 2));
    await waitFor(() => buffer.matching({ services: ['recommendation'], after: '' }).length === 3);
    stop();
    const actions = buffer.matching({ services: ['recommendation'], after: '' }).map((event) => event.action);
    expect(actions).toEqual(['oom', 'die', 'start']);
    expect(sinceCalls[1]).toBe(nowSeconds - 3);
  });

  it('forgets events older than 30 minutes', () => {
    const buffer = new EventsBuffer();
    const old = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    buffer.add({ id: 'old', at: old, service: 'recommendation', container: 'recommendation', action: 'oom', exitCode: null });
    buffer.add({ id: 'new', at: new Date().toISOString(), service: 'recommendation', container: 'recommendation', action: 'die', exitCode: null });
    expect(buffer.matching({ services: ['recommendation'], after: '' }).map((event) => event.id)).toEqual(['new']);
  });
});
