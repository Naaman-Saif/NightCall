import { agentCaseOf, minutesLeftAt } from './agent-case';
import { waitForAnswers } from './context-answers';
import { readSnapshot } from './incident-catalog';
import { LiveStream } from './live-stream';
import { supplyContext } from './operator-context';
import { appendAsRole } from './role-append';
import { freshWriter, impactQuestion, openIncident, toolBody } from './writer.fixture';

function waitSetup(input: { stateDir: string; stream: LiveStream; incidentId: string }) {
  return { ...input, after: 0, waitSeconds: 2, stop: new AbortController().signal };
}

describe('agent case and context', () => {
  it('condenses the incident with minutes left, questions and answers', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    await appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('question_asked', impactQuestion) });
    await supplyContext(writer, { incidentId, body: { questionId: 'q-impact', text: 'Tolerable', idempotencyKey: 'k' } });
    const snapshot = readSnapshot(writer.stateDir, incidentId);
    const recipe = { present: true, source: 'traces', requests: 1040 };
    const view = agentCaseOf(snapshot!, { nowMs: Date.parse(snapshot!.incident.startedAt) + 5 * 60_000, recipe });
    expect(view.incident.minutesLeft).toBe(25);
    expect(view).toMatchObject({ minutesLeft: 25, explorationMinutesLeft: 7, verificationStartMinutesLeft: 8, recipe });
    expect(view.questions[0]).toMatchObject({ questionId: 'q-impact', answer: { text: 'Tolerable' } });
    expect(minutesLeftAt('2026-09-13T00:00:00Z', Date.parse('2026-09-13T01:00:00Z'))).toBe(0);
  });

  it('returns stored answers at once and waits for a new answer when there is none', async () => {
    const stream = new LiveStream();
    const writer = freshWriter(stream);
    const incidentId = await openIncident(writer);
    const waiting = waitForAnswers(waitSetup({ stateDir: writer.stateDir, stream, incidentId }));
    await supplyContext(writer, { incidentId, body: { questionId: null, text: 'Rush the fix', idempotencyKey: 'k1' } });
    expect((await waiting).map((answer) => answer.text)).toEqual(['Rush the fix']);
    const immediate = await waitForAnswers({ ...waitSetup({ stateDir: writer.stateDir, stream, incidentId }), waitSeconds: 0 });
    expect(immediate).toHaveLength(1);
    const later = await waitForAnswers({ ...waitSetup({ stateDir: writer.stateDir, stream, incidentId }), after: 2, waitSeconds: 1 });
    expect(later).toEqual([]);
  });

  it('stops waiting when the caller disconnects', async () => {
    const stream = new LiveStream();
    const writer = freshWriter(stream);
    const incidentId = await openIncident(writer);
    const closed = new AbortController();
    const started = Date.now();
    const waiting = waitForAnswers({ ...waitSetup({ stateDir: writer.stateDir, stream, incidentId }), waitSeconds: 60, stop: closed.signal });
    closed.abort();
    expect(await waiting).toEqual([]);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
