import { BadRequestException } from '@nestjs/common';

import { recoverAndInterrupt } from './boot-interruption';
import { CLAIM_LIMIT, CONFIRM_BY_LIMIT } from './hypothesis-admission';
import { liveSnapshot } from './live-snapshot';
import { appendAsRole } from './role-append';
import { RUN_END_QUIET_MS } from './run-end';
import { crashReading, deploy, leadStatus, recordedRun, snapshotOf } from './run.fixture';
import { freshWriter, openIncident, toolBody } from './writer.fixture';

function proposal(fields: Record<string, unknown>) {
  const base = { hypothesisId: 'h-flag', claim: 'The cache flag change fills memory', supportingEvidenceIds: [], contradictingEvidenceIds: [], predicted: 'p' };
  return toolBody('hypothesis_proposed', { ...base, ...fields });
}

async function runWithReadings() {
  return recordedRun([crashReading('ev-oom', { count: 2, since: '2026-09-13T16:56:00.000Z' }), deploy]);
}

describe('cause rules', () => {
  it('refuses evidence cited as both supporting and contradicting, and removes repeats within a list', async () => {
    const { writer, incidentId } = await runWithReadings();
    const both = proposal({ supportingEvidenceIds: ['ev-deploy'], contradictingEvidenceIds: ['ev-deploy'] });
    await expect(appendAsRole(writer, { role: 'lead', incidentId, body: both })).rejects.toBeInstanceOf(BadRequestException);
    const repeated = proposal({ supportingEvidenceIds: ['ev-oom', 'ev-oom', 'ev-deploy'] });
    const event = await appendAsRole(writer, { role: 'lead', incidentId, body: repeated });
    expect(event.payload.supportingEvidenceIds).toEqual(['ev-oom', 'ev-deploy']);
    expect(snapshotOf(writer, incidentId).runReport.causes[0].supporting.map((item) => item.evidenceId)).toEqual(['ev-oom', 'ev-deploy']);
  });

  it('refuses claims over 160 characters and confirm steps over 200', async () => {
    const { writer, incidentId } = await runWithReadings();
    const longClaim = proposal({ claim: 'x'.repeat(CLAIM_LIMIT + 1) });
    await expect(appendAsRole(writer, { role: 'lead', incidentId, body: longClaim })).rejects.toBeInstanceOf(BadRequestException);
    const longConfirm = proposal({ predicted: 'y'.repeat(CONFIRM_BY_LIMIT + 1) });
    await expect(appendAsRole(writer, { role: 'lead', incidentId, body: longConfirm })).rejects.toBeInstanceOf(BadRequestException);
    const fits = proposal({ claim: 'x'.repeat(CLAIM_LIMIT), predicted: 'y'.repeat(CONFIRM_BY_LIMIT) });
    await expect(appendAsRole(writer, { role: 'lead', incidentId, body: fits })).resolves.toMatchObject({ type: 'hypothesis_proposed' });
  });

  it('never reports not started once agents have written, and settles to interrupted or stopped', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    await appendAsRole(writer, { role: 'lead', incidentId, body: proposal({}) });
    expect(snapshotOf(writer, incidentId).runReport.status).toBe('running');
    const finished = await appendAsRole(writer, { role: 'lead', incidentId, body: leadStatus('finished') });
    const quiet = liveSnapshot(snapshotOf(writer, incidentId), Date.parse(finished.occurredAt) + RUN_END_QUIET_MS);
    expect(quiet.runReport).toMatchObject({ status: 'stopped', statusAt: finished.occurredAt });
    const other = freshWriter();
    const otherId = await openIncident(other);
    await appendAsRole(other, { role: 'lead', incidentId: otherId, body: proposal({}) });
    await recoverAndInterrupt(other);
    expect(snapshotOf(other, otherId).runReport.status).toBe('interrupted');
  });
});
