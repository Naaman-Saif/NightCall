import { NotFoundException } from '@nestjs/common';

import { payloadSchemas } from '../investigation/payload-schemas';
import { freshWriter, openIncident } from '../investigation/writer.fixture';
import { EvidenceController } from '../public-api/evidence.controller';
import type { EventsBuffer } from '../recorder/events-buffer';
import { rangeMinutes, samplesWithin } from '../recorder/series-range';
import type { SeriesSample } from '../recorder/series-sample';
import type { ServiceTracks } from '../recorder/service-tracks';
import { COMPARE_LINK_LABEL, EXCERPT_LINK_LABEL, RECORDER_LINK_LABEL } from './exact-source';
import { readOomEvents } from './read-oom-events';
import { readUsage } from './read-usage';
import { recordReading } from './record-reading';
import type { SourceLink } from './source-links';

function sample(minutesAgo: number): SeriesSample {
  const at = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  return { at, service: 'recommendation', memoryBytes: 100 * 1024 * 1024, limitBytes: null, cpuPercent: 5 };
}

function productionEvent(action: string) {
  return { id: action, at: new Date().toISOString(), service: 'recommendation', container: 'recommendation', action, exitCode: null };
}

const tracks = { windowOf: () => [sample(20), sample(10), sample(1)] } as unknown as ServiceTracks;
const crashes = { matching: () => ['oom', 'die', 'start'].map(productionEvent) } as unknown as EventsBuffer;

describe('exact evidence sources', () => {
  it('links a recorder reading first to the NightCall series for the same window, then to Grafana as a separate measurement', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const reading = readUsage(tracks, { service: 'recommendation', minutes: 15, measure: 'memory' });
    const { evidence } = await recordReading(writer, { incidentId, reading });
    const [exact, compare] = evidence.payload.sourceLinks as SourceLink[];
    const url = new URL(exact.url, 'http://night-call');
    expect(exact.label).toBe(RECORDER_LINK_LABEL);
    expect(url.pathname).toBe(`/api/incidents/${incidentId}/series`);
    expect(url.searchParams.get('service')).toBe('recommendation');
    expect(Number(url.searchParams.get('to')) - Number(url.searchParams.get('from'))).toBe(15 * 60_000);
    expect(compare.label).toBe(COMPARE_LINK_LABEL);
    expect(compare.url).toContain('/grafana/explore');
  });

  it('links crash events to the stored excerpt served by NightCall and keeps the counts', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const { evidence } = await recordReading(writer, { incidentId, reading: readOomEvents(crashes, { service: 'recommendation', minutes: 30 }) });
    const evidenceId = String(evidence.payload.evidenceId);
    const [exact] = evidence.payload.sourceLinks as SourceLink[];
    expect(exact).toEqual({ label: EXCERPT_LINK_LABEL, url: `/api/incidents/${incidentId}/evidence/${evidenceId}` });
    const stored = new EvidenceController(writer).evidence(incidentId, evidenceId);
    expect(stored).toMatchObject({ evidenceId, kind: 'oom_events', crashCounts: { oom: 1, die: 1, start: 1 } });
    expect(stored.excerpt).toContain('oom recommendation');
    expect(() => new EvidenceController(writer).evidence(incidentId, 'ev-missing')).toThrow(NotFoundException);
  });

  it('accepts NightCall links and rejects other relative or script links', () => {
    const evidence = { evidenceId: 'e', kind: 'logs', source: 's', summary: 's', observedAt: 'now', excerpt: 'x' };
    const withUrl = (url: string) => payloadSchemas.evidence_recorded.safeParse({ ...evidence, sourceLinks: [{ label: 'l', url }] }).success;
    expect(withUrl('/api/incidents/inc-001/evidence/e')).toBe(true);
    expect(withUrl('/etc/passwd')).toBe(false);
    expect(withUrl('javascript:alert(1)')).toBe(false);
  });

  it('serves only the samples inside a fixed window', () => {
    const samples = [sample(20), sample(10), sample(1)];
    const range = { fromMs: Date.now() - 15 * 60_000, toMs: Date.now() - 5 * 60_000 };
    expect(samplesWithin(samples, range)).toEqual([samples[1]]);
    expect(rangeMinutes(range)).toBe(10);
  });
});
