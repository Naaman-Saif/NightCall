import { BadRequestException, ConflictException } from '@nestjs/common';

import { recoverAndInterrupt } from '../investigation/boot-interruption';
import { readSnapshot } from '../investigation/incident-catalog';
import { freshWriter, openIncident } from '../investigation/writer.fixture';
import { EventsBuffer } from '../recorder/events-buffer';
import { ServiceTracks } from '../recorder/service-tracks';
import { canaryQuery, errorShare, spanQueries } from './failure-rate-query';
import { readOomEvents } from './read-oom-events';
import { readUsage } from './read-usage';
import { logsQueryShape, parseQuery, serviceQueryShape, tracesQueryShape } from './reader-query';
import { answerReaderCall } from './record-reading';

const now = () => new Date().toISOString();

describe('production readers', () => {
  it('keeps every query inside its bounds', () => {
    expect(parseQuery(serviceQueryShape, { service: 'recommendation' })).toEqual({ service: 'recommendation', minutes: 10 });
    for (const minutes of ['0', '31', 'x']) {
      expect(() => parseQuery(serviceQueryShape, { service: 'recommendation', minutes })).toThrow(BadRequestException);
    }
    expect(() => parseQuery(serviceQueryShape, { service: '../etc' })).toThrow(BadRequestException);
    expect(() => parseQuery(logsQueryShape, { service: 'frontend', tail: '201' })).toThrow(BadRequestException);
    const tooMany = Array.from({ length: 21 }, () => 'a'.repeat(32)).join(',');
    expect(() => parseQuery(tracesQueryShape, { service: 'frontend', traceIds: tooMany })).toThrow(BadRequestException);
    expect(() => parseQuery(tracesQueryShape, { service: 'frontend', traceIds: 'not-hex' })).toThrow(BadRequestException);
    expect(parseQuery(tracesQueryShape, { service: 'frontend', traceIds: `${'b'.repeat(32)}` }).traceIds).toHaveLength(1);
  });

  it('asks Prometheus for ListRecommendations errors and the canary, with at least a two minute window', () => {
    const queries = spanQueries({ service: 'recommendation', span: 'oteldemo.RecommendationService/ListRecommendations' }, 1);
    expect(queries.errors).toContain('status_code="STATUS_CODE_ERROR"}[2m])) or vector(0)');
    expect(canaryQuery(10)).toContain('/api/recommendations');
    expect(errorShare({ errors: 0.01, total: 1 })).toBeCloseTo(0.01);
    expect(errorShare({ errors: 0, total: 0 })).toBeNull();
  });

  it('summarizes memory with the limit, or none when the container has no limit', () => {
    const tracks = new ServiceTracks();
    tracks.trackOf('night-call').samples.push({ at: now(), service: 'night-call', memoryBytes: 70 * 1024 * 1024, limitBytes: null, cpuPercent: 2 });
    const reading = readUsage(tracks, { service: 'night-call', minutes: 5, measure: 'memory' });
    expect(reading.summary).toBe('night-call memory latest 70 MiB, peak 70 MiB, limit none (1 samples over 5 minutes)');
    expect(reading.kind).toBe('memory');
  });

  it('counts out-of-memory, exit and start events for one service', () => {
    const events = new EventsBuffer();
    events.add({ id: '1', at: now(), service: 'recommendation', container: 'recommendation', action: 'oom', exitCode: null });
    events.add({ id: '2', at: now(), service: 'recommendation', container: 'recommendation', action: 'die', exitCode: '137' });
    events.add({ id: '3', at: now(), service: 'frontend', container: 'frontend', action: 'die', exitCode: '1' });
    const reading = readOomEvents(events, { service: 'recommendation', minutes: 10 });
    expect(reading.summary).toContain('1 out-of-memory events, 1 exits and 0 starts');
    expect(reading.excerpt).toContain('die recommendation exitCode=137');
  });

  it('records each reading as evidence on the active incident and refuses a finished one', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const reading = { kind: 'cpu' as const, source: 'recorder: recommendation', summary: 'cpu fine', excerpt: '3%', data: { samples: 1 } };
    const answer = await answerReaderCall(writer, { incidentId, read: async () => reading });
    expect(answer.evidence).toMatchObject({ type: 'evidence_recorded', actor: 'system', sequence: 2 });
    const evidenceId = String(answer.evidence.payload.evidenceId);
    expect(readSnapshot(writer.stateDir, incidentId)?.evidence[evidenceId]).toMatchObject({ kind: 'cpu', summary: 'cpu fine' });
    await recoverAndInterrupt(writer);
    const late = answerReaderCall(writer, { incidentId, read: async () => reading });
    await expect(late).rejects.toBeInstanceOf(ConflictException);
  });
});
