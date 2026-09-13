import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { EventDraft } from '../investigation/event-types';
import { readSnapshot } from '../investigation/incident-catalog';
import { incidentFolder } from '../investigation/incident-paths';
import { appendAsService } from '../investigation/service-append';
import { freshWriter, openIncident } from '../investigation/writer.fixture';
import { appendJsonLines, productionEventsPath } from '../recorder/series-files';
import { readIncidentMarkers } from './incident-markers';
import { marker } from './marker';

const samplePath = join(__dirname, '..', '..', 'web', 'public', 'fixtures', 'sample-incident.json');
const sample = (JSON.parse(readFileSync(samplePath, 'utf8')) as { events: EventDraft[] }).events.slice(1);

function draftsUntil(type: string): EventDraft[] {
  const end = sample.findIndex((event) => event.type === type);
  return sample.slice(0, end === -1 ? sample.length : end).map(({ actor, type: kind, summary, refs, payload }) => ({ actor, type: kind, summary, refs, payload }));
}

async function incidentWith(drafts: EventDraft[]) {
  const writer = freshWriter();
  const incidentId = await openIncident(writer);
  for (const draft of drafts) await appendAsService(writer, { incidentId, draft });
  return { writer, incidentId };
}

function productionEvent(action: string, change: { service?: string; secondsBefore: number }) {
  const at = new Date(Date.now() - change.secondsBefore * 1000).toISOString();
  const service = change.service ?? 'recommendation';
  return { id: `${action}-${change.secondsBefore}`, at, service, container: service, action, exitCode: action === 'die' ? '137' : null };
}

describe('incident markers', () => {
  it('maps the whole sample into ordered markers with labels from the question, not the answer', async () => {
    const { writer, incidentId } = await incidentWith(draftsUntil('never'));
    const markers = readIncidentMarkers(writer.stateDir, incidentId);
    const kinds = markers.map((found) => found.kind);
    expect(markers.map((found) => Date.parse(found.at))).toEqual([...markers.map((found) => Date.parse(found.at))].sort((a, b) => a - b));
    expect(kinds[0]).toBe('config_change');
    expect(new Set(kinds)).toEqual(new Set(['config_change', 'alarm', 'operator_answer', 'fix_verified', 'pr_opened']));
    const answers = markers.filter((found) => found.kind === 'operator_answer');
    expect(answers).toHaveLength(sample.filter((event) => event.type === 'context_supplied').length);
    expect(answers[0].label.startsWith('Answer: Recommendations are failing')).toBe(true);
    expect(markers.find((found) => found.kind === 'pr_opened')?.label).toBe('Pull request #1 opened');
    expect(markers.find((found) => found.kind === 'config_change')?.ref).toBe('ev-deploy');
  });

  it('adds crash and restart markers for the alerted service only, before the alarm when they happened before it', async () => {
    const { writer, incidentId } = await incidentWith([]);
    const events = [
      productionEvent('oom', { secondsBefore: 90 }),
      productionEvent('die', { secondsBefore: 89 }),
      productionEvent('start', { secondsBefore: 80 }),
      productionEvent('die', { service: 'frontend', secondsBefore: 70 }),
    ];
    appendJsonLines(productionEventsPath(incidentFolder(writer.stateDir, incidentId)), events);
    const markers = readIncidentMarkers(writer.stateDir, incidentId);
    expect(markers.map((found) => `${found.kind}: ${found.label}`)).toEqual([
      'crash: recommendation ran out of memory',
      'crash: recommendation exited with code 137',
      'restart: recommendation started',
      'alarm: RecommendationRestarted fired',
    ]);
    expect(markers[3].at).toBe(readSnapshot(writer.stateDir, incidentId)?.incident.startedAt);
  });

  it('drops fix_verified once a new mitigation supersedes the approved run', async () => {
    const { writer, incidentId } = await incidentWith(draftsUntil('publication_changed'));
    expect(readIncidentMarkers(writer.stateDir, incidentId).some((found) => found.kind === 'fix_verified')).toBe(true);
    const superseding = sample.find((event) => event.type === 'mitigation_proposed') as EventDraft;
    const draft = { ...superseding, payload: { ...superseding.payload, mitigationId: 'm-other' } };
    await appendAsService(writer, { incidentId, draft });
    expect(readIncidentMarkers(writer.stateDir, incidentId).some((found) => found.kind === 'fix_verified')).toBe(false);
  });

  it('keeps labels short and on one line', () => {
    const long = marker({ at: 'now', kind: 'operator_answer', label: `Answer:\n${'x'.repeat(300)}`, ref: null });
    expect(long.label).toHaveLength(120);
    expect(long.label.endsWith('...')).toBe(true);
    expect(long.label.includes('\n')).toBe(false);
  });
});
