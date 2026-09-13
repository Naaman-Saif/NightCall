import { ConflictException } from '@nestjs/common';
import { readFileSync, writeFileSync } from 'node:fs';

import { eventsPath, incidentFolder, snapshotPath } from './incident-paths';
import { openInvestigation } from './open-investigation';
import { appendAsRole } from './role-append';
import { recordedRun, snapshotOf, stopBody } from './run.fixture';
import { recommendationFacts } from './writer.fixture';

describe('releasing the one incident per service block', () => {
  it('finishes the incident when the run stops, with a completion reason per stop reason, and lets the next incident open', async () => {
    const answered = await recordedRun([]);
    await appendAsRole(answered.writer, { role: 'lead', incidentId: answered.incidentId, body: stopBody('answer_recorded') });
    const snapshot = snapshotOf(answered.writer, answered.incidentId);
    expect(snapshot.incident).toMatchObject({ lifecycle: 'finished', completionReason: 'completed', phase: 'handoff' });
    expect(snapshot.runReport.status).toBe('stopped');
    const next = await openInvestigation(answered.writer, { facts: recommendationFacts, blockDuplicates: true });
    expect(next?.incidentId).toBe('inc-002');
    await expect(appendAsRole(answered.writer, { role: 'lead', incidentId: answered.incidentId, body: stopBody('no_answer') })).rejects.toBeInstanceOf(ConflictException);
    const failed = await recordedRun([]);
    await appendAsRole(failed.writer, { role: 'lead', incidentId: failed.incidentId, body: stopBody('error') });
    expect(snapshotOf(failed.writer, failed.incidentId).incident).toMatchObject({ lifecycle: 'finished', completionReason: 'infrastructure_failure' });
  });

  it('does not let an incident past its deadline block a new one', async () => {
    const { writer, incidentId } = await recordedRun([]);
    expect(await openInvestigation(writer, { facts: recommendationFacts, blockDuplicates: true })).toBeNull();
    const folder = incidentFolder(writer.stateDir, incidentId);
    for (const path of [eventsPath(folder), snapshotPath(folder)]) {
      writeFileSync(path, readFileSync(path, 'utf8').replace(/"deadlineAt": ?"[^"]+"/g, '"deadlineAt":"2026-09-13T18:45:00.000Z"'));
    }
    expect(snapshotOf(writer, incidentId).incident.lifecycle).toBe('active');
    const next = await openInvestigation(writer, { facts: recommendationFacts, blockDuplicates: true });
    expect(next?.incidentId).toBe('inc-002');
  });
});
