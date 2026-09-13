import type { IncidentEvent } from './event-types';
import { liveSnapshot, STALL_AFTER_MS } from './live-snapshot';
import { reduceInvestigation } from './reduce-investigation';
import { appendAsRole } from './role-append';
import { RUN_END_QUIET_MS } from './run-end';
import { INFERRED_STOP_NOTE, withRunReport } from './run-report';
import { crashReading, failureRate, leadStatus, recordedRun, snapshotOf } from './run.fixture';

const since = '2026-09-13T16:56:00.000Z';

async function finishedLeadRun() {
  const run = await recordedRun([failureRate, crashReading('ev-oom', { count: 2, since })]);
  const finished = await appendAsRole(run.writer, { role: 'lead', incidentId: run.incidentId, body: leadStatus('finished') });
  return { ...run, finishedAt: finished.occurredAt };
}

describe('run end without investigation_stopped', () => {
  it('infers a stop at the last agent event once the finished lead has been quiet for 2 minutes', async () => {
    const { writer, incidentId, finishedAt } = await finishedLeadRun();
    const stored = snapshotOf(writer, incidentId);
    const lastMs = Date.parse(finishedAt);
    expect(liveSnapshot(stored, lastMs + RUN_END_QUIET_MS - 1000).runReport.status).toBe('running');
    const stopped = liveSnapshot(stored, lastMs + RUN_END_QUIET_MS);
    expect(stopped.runReport).toMatchObject({ status: 'stopped', statusAt: finishedAt, note: INFERRED_STOP_NOTE, nowDoing: null });
    expect(INFERRED_STOP_NOTE).toBe('The run reported finished and nothing followed for 2 minutes, so NightCall shows it as stopped.');
    expect(stopped.headline).toBe(
      'Recommendation ran out of memory and restarted 2 times since 16:56 UTC. NightCall read 2 signals, asked one question, and stopped. The cause is not established.',
    );
  });

  it('keeps the inferred stop when the budget runs out later instead of calling it interrupted', async () => {
    const { writer, incidentId, finishedAt } = await finishedLeadRun();
    const stored = snapshotOf(writer, incidentId);
    const occurredAt = new Date(Date.parse(finishedAt) + 30 * 60_000).toISOString();
    const budget = { type: 'budget_exhausted', actor: 'system', occurredAt, payload: {} } as unknown as IncidentEvent;
    const ended = withRunReport(reduceInvestigation(stored, budget));
    expect(ended.runReport).toMatchObject({ status: 'stopped', statusAt: finishedAt });
  });

  it('shows a run whose lead never finished as stalled after 5 quiet minutes', async () => {
    const { writer, incidentId } = await recordedRun([failureRate]);
    const stored = snapshotOf(writer, incidentId);
    const lastMs = Date.parse(String(stored.lastAgentActivityAt));
    expect(liveSnapshot(stored, lastMs + RUN_END_QUIET_MS).runReport.status).toBe('running');
    const stalled = liveSnapshot(stored, lastMs + STALL_AFTER_MS);
    expect(stalled.runReport).toMatchObject({ status: 'stalled', statusAt: stored.lastAgentActivityAt });
    expect(stalled.headline).toMatch(/ Investigation stalled with no agent activity since \d{2}:\d{2} UTC\.$/);
  });
});
