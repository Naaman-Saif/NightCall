import { appendAsRole } from './role-append';
import { NOT_DONE } from './run-report';
import { supplyContext } from './operator-context';
import {
  crashReading,
  crashSummary,
  DEPLOY_SUMMARY,
  deploy,
  failureRate,
  MEMORY_SUMMARY,
  memory,
  RATE_SUMMARY,
  recordedRun,
  snapshotOf,
  stopBody,
} from './run.fixture';
import { toolBody } from './writer.fixture';

const since = '2026-09-13T16:56:00.000Z';

describe('run report', () => {
  it('lists every reading in order with the answer, one finding per reading, and a stopped headline', async () => {
    const { writer, incidentId } = await recordedRun([failureRate, crashReading('ev-oom', { count: 2, since }), memory, deploy]);
    const refs = ['ev-rate', 'ev-oom', 'ev-memory', 'ev-deploy'];
    const stop = await appendAsRole(writer, { role: 'lead', incidentId, body: stopBody('answer_recorded', refs) });
    const snapshot = snapshotOf(writer, incidentId);
    expect(snapshot.runReport).toEqual({
      status: 'stopped',
      statusAt: stop.occurredAt,
      note: null,
      nowDoing: null,
      did: [
        { text: 'Read failure rate', value: '0.00% over 10 min', evidenceId: 'ev-rate', questionId: null },
        { text: 'Read crashes', value: '2 out-of-memory kills, 2 restarts in 10 min', evidenceId: 'ev-oom', questionId: null },
        { text: 'Read memory', value: 'latest 96 MiB, peak 200 MiB in 15 min', evidenceId: 'ev-memory', questionId: null },
        { text: 'Read deploy history', value: 'no changes', evidenceId: 'ev-deploy', questionId: null },
        { text: 'Asked about customer impact', value: 'Tolerable', evidenceId: null, questionId: 'q-impact' },
      ],
      found: [RATE_SUMMARY, crashSummary(2), MEMORY_SUMMARY, DEPLOY_SUMMARY],
      notDone: NOT_DONE,
    });
    expect(snapshot.headline).toBe(
      'Recommendation ran out of memory and restarted 2 times since 16:56 UTC. NightCall read 4 signals, asked one question, and stopped. The cause is not established.',
    );
  });

  it('takes crash counts for findings and headline from the same latest reading', async () => {
    const older = crashReading('ev-oom-1', { count: 1, since: '2026-09-13T16:47:00.000Z' });
    const { writer, incidentId } = await recordedRun([older, crashReading('ev-oom-2', { count: 2, since })]);
    const snapshot = snapshotOf(writer, incidentId);
    expect(snapshot.runReport.found).toEqual([crashSummary(2)]);
    expect(snapshot.headline.startsWith('Recommendation ran out of memory and restarted 2 times since 16:56 UTC.')).toBe(true);
    expect(snapshot.runReport.did.map((step) => step.evidenceId)).toEqual(['ev-oom-1', 'ev-oom-2', null]);
  });

  it('shows what a running investigation is doing', async () => {
    const { writer, incidentId, startedAt } = await recordedRun([failureRate]);
    const assignment = { role: 'investigator', status: 'working', assignment: 'Comparing memory with the crash times' };
    await appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('role_status_changed', assignment) });
    const report = snapshotOf(writer, incidentId).runReport;
    expect(report).toMatchObject({ status: 'running', statusAt: startedAt, note: null, nowDoing: 'Comparing memory with the crash times' });
  });

  it('adds context that answers no question as its own step', async () => {
    const { writer, incidentId } = await recordedRun([]);
    await supplyContext(writer, { incidentId, body: { questionId: null, text: 'Deploy froze at 17:00', idempotencyKey: 'k2' } });
    const did = snapshotOf(writer, incidentId).runReport.did;
    expect(did.at(-1)).toEqual({ text: 'Operator added context', value: 'Deploy froze at 17:00', evidenceId: null, questionId: null });
  });
});
