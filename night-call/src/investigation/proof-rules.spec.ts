import { ConflictException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { EventDraft } from './event-types';
import type { EventWriter } from './event-writer';
import { readSnapshot } from './incident-catalog';
import { appendAsService } from './service-append';
import { freshWriter, openIncident } from './writer.fixture';

type SampleEvent = EventDraft & { delayMs: number };

const samplePath = join(__dirname, '..', '..', 'web', 'public', 'fixtures', 'sample-incident.json');
const sample = (JSON.parse(readFileSync(samplePath, 'utf8')) as { events: SampleEvent[] }).events;

function sampleUntil(type: string): EventDraft[] {
  const found = sample.findIndex((event) => event.type === type);
  const end = found === -1 ? sample.length : found;
  return sample.slice(1, end).map(({ actor, type: eventType, summary, refs, payload }) => ({ actor, type: eventType, summary, refs, payload }));
}

function sampleEvent(type: string, change: Record<string, unknown> = {}): EventDraft {
  const found = sample.find((event) => event.type === type) as SampleEvent;
  return { actor: found.actor, type: found.type, summary: found.summary, refs: [], payload: { ...found.payload, ...change } };
}

async function incidentWith(drafts: EventDraft[]): Promise<{ writer: EventWriter; incidentId: string }> {
  const writer = freshWriter();
  const incidentId = await openIncident(writer);
  for (const draft of drafts) await appendAsService(writer, { incidentId, draft });
  return { writer, incidentId };
}

describe('proof rules', () => {
  it('turns the whole sample into a verified, published, finished incident', async () => {
    const { writer, incidentId } = await incidentWith(sampleUntil('never'));
    const snapshot = readSnapshot(writer.stateDir, incidentId);
    expect(snapshot?.reproduction).toBe('confirmed');
    expect(snapshot?.cycles.map((cycle) => cycle.state)).toEqual(['passed', 'passed', 'passed']);
    expect(snapshot?.mitigation?.status).toBe('verified');
    expect(snapshot?.publication.state).toBe('published');
    expect(snapshot?.incident).toMatchObject({ phase: 'handoff', lifecycle: 'finished' });
  });

  it('shows two of three passed cycles as testing, never verified', async () => {
    const drafts = sampleUntil('cycle_started').concat(sample.filter((event) => event.type.startsWith('cycle')).slice(0, 4));
    const { writer, incidentId } = await incidentWith(drafts);
    const snapshot = readSnapshot(writer.stateDir, incidentId);
    expect(snapshot?.mitigation?.status).toBe('testing');
    expect(snapshot?.incident.phase).toBe('verifying');
  });

  it('refuses cycle and verifier events for a run that is not the current one', async () => {
    const { writer, incidentId } = await incidentWith(sampleUntil('cycle_started'));
    for (const type of ['cycle_started', 'cycle_finished', 'verification_reviewed']) {
      const draft = sampleEvent(type, { verificationRunId: 'vr-stale' });
      await expect(appendAsService(writer, { incidentId, draft })).rejects.toBeInstanceOf(ConflictException);
    }
    const otherMitigation = sampleEvent('verification_started', { mitigationId: 'm-other' });
    await expect(appendAsService(writer, { incidentId, draft: otherMitigation })).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses publishing before the mitigation is verified', async () => {
    const { writer, incidentId } = await incidentWith(sampleUntil('verification_reviewed'));
    const draft = sampleEvent('publication_changed');
    await expect(appendAsService(writer, { incidentId, draft })).rejects.toThrow('not verified');
  });

  it('lets a new mitigation supersede the old one and clear its proof', async () => {
    const { writer, incidentId } = await incidentWith(sampleUntil('verification_reviewed'));
    const draft = sampleEvent('mitigation_proposed', { mitigationId: 'm-restart-only' });
    await appendAsService(writer, { incidentId, draft });
    const snapshot = readSnapshot(writer.stateDir, incidentId);
    expect(snapshot?.supersededMitigations.map((mitigation) => mitigation.id)).toEqual(['m-flag-off']);
    expect(snapshot).toMatchObject({ cycles: [], verification: null, currentVerificationRun: null });
    expect(snapshot?.mitigation).toMatchObject({ id: 'm-restart-only', status: 'proposed' });
    expect(snapshot?.incident.phase).toBe('mitigating');
  });
});
