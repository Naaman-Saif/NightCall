import { readSnapshot } from '../investigation/incident-catalog';
import { payloadSchemas } from '../investigation/payload-schemas';
import { freshWriter, openIncident } from '../investigation/writer.fixture';
import { deployChangeOf, deployHistoryReading, type CommitDetail } from './read-deploy-history';
import { answerReaderCall } from './record-reading';
import { grafanaExploreLink, jaegerSearchLink } from './source-links';

const release: CommitDetail = {
  sha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
  html_url: 'https://github.com/Naaman-Saif/opentelemetry-demo/commit/a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
  commit: { message: 'release: enable recommendation cache\n\nbody', committer: { date: '2026-09-13T15:40:00Z' }, author: { name: 'Naaman Saif' } },
  files: [{ filename: 'src/flagd/demo.flagd.json', patch: '-      "defaultVariant": "off"\n+      "defaultVariant": "on"' }],
};

describe('source links', () => {
  it('builds a Grafana Explore link with the exact query, the demo datasource and a fixed range', () => {
    const link = grafanaExploreLink({ label: 'errors', expr: 'sum(rate(x[2m]))' }, { fromMs: 1000, toMs: 2000 });
    const panes = JSON.parse(decodeURIComponent(link.url.split('panes=')[1])) as { nightcall: Record<string, unknown> };
    expect(link.url.startsWith('http://127.0.0.1:8080/grafana/explore?')).toBe(true);
    expect(panes.nightcall).toMatchObject({ datasource: 'webstore-metrics', range: { from: '1000', to: '2000' } });
    expect(JSON.stringify(panes.nightcall)).toContain('sum(rate(x[2m]))');
  });

  it('builds a Jaeger search link in microseconds', () => {
    const link = jaegerSearchLink({ service: 'recommendation', range: { fromMs: 1000, toMs: 2000 }, errorsOnly: true });
    const params = new URL(link.url).searchParams;
    expect(params.get('start')).toBe('1000000');
    expect(params.get('end')).toBe('2000000');
    expect(params.get('tags')).toBe('{"error":"true"}');
  });

  it('turns commit details into deploy history evidence observed at the commit time', () => {
    const reading = deployHistoryReading([deployChangeOf(release)]);
    expect(reading).toMatchObject({ kind: 'deploy_history', observedAt: '2026-09-13T15:40:00Z' });
    expect(reading.summary).toBe('Flag file changed in a1b2c3d: release: enable recommendation cache');
    expect(reading.sourceLinks).toEqual([{ label: 'GitHub: commit a1b2c3d', url: release.html_url }]);
    expect(reading.excerpt).toContain('+      "defaultVariant": "on"');
  });

  it('accepts optional source links in evidence and rejects non-http links', () => {
    const evidence = { evidenceId: 'e', kind: 'logs', source: 's', summary: 's', observedAt: 'now', excerpt: 'x' };
    expect(payloadSchemas.evidence_recorded.safeParse(evidence).success).toBe(true);
    const linked = { ...evidence, sourceLinks: [{ label: 'Grafana', url: 'http://127.0.0.1:8080/grafana/explore' }] };
    expect(payloadSchemas.evidence_recorded.safeParse(linked).success).toBe(true);
    const unsafe = { ...evidence, sourceLinks: [{ label: 'bad', url: 'javascript:alert(1)' }] };
    expect(payloadSchemas.evidence_recorded.safeParse(unsafe).success).toBe(false);
  });

  it('stores the links and the commit time in the snapshot evidence', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const answer = await answerReaderCall(writer, { incidentId, read: async () => deployHistoryReading([deployChangeOf(release)]) });
    const stored = readSnapshot(writer.stateDir, incidentId)?.evidence[String(answer.evidence.payload.evidenceId)];
    expect(stored).toMatchObject({ kind: 'deploy_history', observedAt: '2026-09-13T15:40:00Z' });
    expect(stored?.sourceLinks).toHaveLength(1);
  });
});
