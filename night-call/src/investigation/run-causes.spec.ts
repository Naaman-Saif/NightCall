import { ConflictException } from '@nestjs/common';

import { appendAsRole } from './role-append';
import { NOT_DONE } from './run-report';
import { crashReading, crashSummary, failureRate, MEMORY_SUMMARY, memory, RATE_SUMMARY, recordedRun, snapshotOf } from './run.fixture';
import { toolBody } from './writer.fixture';

const claim = 'The recommendation cache grows without bound.';
const confirmBy = 'Turning the cache flag off stops the restarts';

function proposal(contradictingEvidenceIds: string[]) {
  const payload = { hypothesisId: 'h-cache', claim, supportingEvidenceIds: ['ev-oom', 'ev-memory'], contradictingEvidenceIds, predicted: confirmBy };
  return toolBody('hypothesis_proposed', payload);
}

function statusChange(status: string) {
  return toolBody('hypothesis_status_changed', { hypothesisId: 'h-cache', status, reason: 'compared memory with the crash times' });
}

async function runWithCause(contradictingEvidenceIds: string[]) {
  const run = await recordedRun([failureRate, crashReading('ev-oom', { count: 2, since: '2026-09-13T16:56:00.000Z' }), memory]);
  await appendAsRole(run.writer, { role: 'lead', incidentId: run.incidentId, body: proposal(contradictingEvidenceIds) });
  return run;
}

describe('run report causes', () => {
  it('lists a proposed cause with its cited evidence and stops listing the cause search as not done', async () => {
    const { writer, incidentId } = await runWithCause([]);
    const snapshot = snapshotOf(writer, incidentId);
    expect(snapshot.runReport.causes).toEqual([
      {
        id: 'h-cache',
        claim,
        status: 'proposed',
        supporting: [
          { text: crashSummary(2), evidenceId: 'ev-oom' },
          { text: MEMORY_SUMMARY, evidenceId: 'ev-memory' },
        ],
        contradicting: [],
        confirmBy,
      },
    ]);
    expect(snapshot.runReport.notDone).toEqual(NOT_DONE.slice(1));
    expect(snapshot.runReport.found).toEqual([RATE_SUMMARY, crashSummary(2), MEMORY_SUMMARY]);
    expect(snapshot.headline).toContain(' Possible causes: 1, none established yet. ');
  });

  it('names a supported cause as most likely and never as established without a reproduction', async () => {
    const { writer, incidentId } = await runWithCause([]);
    await appendAsRole(writer, { role: 'lead', incidentId, body: statusChange('supported') });
    const snapshot = snapshotOf(writer, incidentId);
    expect(snapshot.runReport.causes[0].status).toBe('supported');
    expect(snapshot.headline).toContain(' Most likely cause: The recommendation cache grows without bound, not yet reproduced. ');
    expect(snapshot.headline).not.toMatch(/established|proven/);
  });

  it('refuses to mark a cause supported while recorded evidence it cites contradicts it', async () => {
    const { writer, incidentId } = await runWithCause(['ev-rate']);
    await expect(appendAsRole(writer, { role: 'lead', incidentId, body: statusChange('supported') })).rejects.toBeInstanceOf(ConflictException);
    expect(snapshotOf(writer, incidentId).runReport.causes[0].contradicting).toEqual([{ text: RATE_SUMMARY, evidenceId: 'ev-rate' }]);
    await appendAsRole(writer, { role: 'lead', incidentId, body: statusChange('contradicted') });
    const snapshot = snapshotOf(writer, incidentId);
    expect(snapshot.runReport.causes[0].status).toBe('contradicted');
    expect(snapshot.headline).toContain(' The cause is not established. ');
  });
});
