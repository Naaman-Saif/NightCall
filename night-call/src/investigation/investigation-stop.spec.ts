import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

import { recoverAndInterrupt } from './boot-interruption';
import { appendAsRole } from './role-append';
import { ERROR_NOTE } from './run-report';
import { crashReading, failureRate, recordedRun, snapshotOf, stopBody } from './run.fixture';

describe('investigation_stopped from the lead', () => {
  it('records the stop with its refs and keeps it through a restart', async () => {
    const { writer, incidentId } = await recordedRun([failureRate]);
    const event = await appendAsRole(writer, { role: 'lead', incidentId, body: stopBody('no_answer', ['ev-rate']) });
    expect(event).toMatchObject({ actor: 'lead', type: 'investigation_stopped', refs: ['ev-rate'] });
    const snapshot = snapshotOf(writer, incidentId);
    expect(snapshot).toMatchObject({ investigation: 'stopped', investigationStop: { reason: 'no_answer', stoppedAt: event.occurredAt } });
    await recoverAndInterrupt(writer);
    expect(snapshotOf(writer, incidentId).runReport.status).toBe('stopped');
  });

  it('shows an error stop as stopped with a failure note', async () => {
    const since = '2026-09-13T16:56:00.000Z';
    const { writer, incidentId } = await recordedRun([crashReading('ev-oom', { count: 2, since })]);
    await appendAsRole(writer, { role: 'lead', incidentId, body: stopBody('error') });
    const snapshot = snapshotOf(writer, incidentId);
    expect(snapshot.runReport).toMatchObject({ status: 'stopped', note: ERROR_NOTE });
    expect(snapshot.headline).toContain('NightCall read one signal, asked one question, and stopped after a failure.');
  });

  it('refuses a second stop, a changed summary, claimed next steps and other roles', async () => {
    const { writer, incidentId } = await recordedRun([]);
    const stop = stopBody('answer_recorded');
    const changedSummary = { ...stop, summary: 'Something else' };
    await expect(appendAsRole(writer, { role: 'lead', incidentId, body: changedSummary })).rejects.toBeInstanceOf(BadRequestException);
    const nextSteps = { ...stop, payload: { ...(stop.payload as object), nextStepsAvailable: true } };
    await expect(appendAsRole(writer, { role: 'lead', incidentId, body: nextSteps })).rejects.toBeInstanceOf(BadRequestException);
    await expect(appendAsRole(writer, { role: 'investigator', incidentId, body: stop })).rejects.toBeInstanceOf(ForbiddenException);
    await appendAsRole(writer, { role: 'lead', incidentId, body: stop });
    await expect(appendAsRole(writer, { role: 'lead', incidentId, body: stop })).rejects.toBeInstanceOf(ConflictException);
  });
});
