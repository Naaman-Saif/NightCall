import { supplyContext } from './operator-context';
import { readSnapshot } from './incident-catalog';
import { appendAsRole } from './role-append';
import { freshWriter, impactQuestion, openIncident, toolBody } from './writer.fixture';

const brief = { summary: 'Memory runs out', knownFacts: [{ text: 'OOM kill', evidenceIds: ['ev-oom'] }], unknowns: [], nextStep: 'Reproduce' };
const hypothesis = { hypothesisId: 'h-1', claim: 'Cache flag', supportingEvidenceIds: [], contradictingEvidenceIds: [], predicted: 'Crash' };

describe('reducer', () => {
  it('seeds an active incident with label, deadline and three ready roles', async () => {
    const writer = freshWriter();
    const snapshot = readSnapshot(writer.stateDir, await openIncident(writer));
    expect(snapshot?.incident).toMatchObject({ label: 'INC-001', lifecycle: 'active', phase: 'briefing', attention: 'none' });
    const budget = Date.parse(String(snapshot?.incident.deadlineAt)) - Date.parse(String(snapshot?.incident.startedAt));
    expect(budget).toBe(30 * 60 * 1000);
    expect(Object.values(snapshot?.roles ?? {}).map((role) => role.status)).toEqual(['ready', 'ready', 'ready']);
  });

  it('tracks attention from open questions and records the answer', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    await appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('question_asked', impactQuestion) });
    expect(readSnapshot(writer.stateDir, incidentId)?.incident.attention).toBe('context_requested');
    const blocking = { ...impactQuestion, questionId: 'q-2', blocks: 'mitigation' };
    await appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('question_asked', blocking) });
    expect(readSnapshot(writer.stateDir, incidentId)?.incident.attention).toBe('blocked');
    await supplyContext(writer, { incidentId, body: { questionId: 'q-2', text: 'Rush it', idempotencyKey: 'a' } });
    await supplyContext(writer, { incidentId, body: { questionId: 'q-impact', text: 'Tolerable', idempotencyKey: 'b' } });
    const snapshot = readSnapshot(writer.stateDir, incidentId);
    expect(snapshot?.incident.attention).toBe('none');
    expect(snapshot?.questions.map((question) => question.answer?.text)).toEqual(['Tolerable', 'Rush it']);
    expect(snapshot?.context).toHaveLength(2);
  });

  it('keeps the brief, roles and hypotheses and moves the phase', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    await appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('brief_updated', brief) });
    const work = { role: 'investigator', status: 'working', assignment: 'Reproduce' };
    await appendAsRole(writer, { role: 'investigator', incidentId, body: toolBody('role_status_changed', work) });
    await appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('hypothesis_proposed', hypothesis) });
    const snapshot = readSnapshot(writer.stateDir, incidentId);
    expect(snapshot?.brief?.nextStep).toBe('Reproduce');
    expect(snapshot?.roles.investigator).toMatchObject({ status: 'working', assignment: 'Reproduce' });
    expect(snapshot?.hypotheses[0]).toMatchObject({ id: 'h-1', status: 'proposed' });
    expect(snapshot?.incident.phase).toBe('investigating');
    expect(snapshot?.lastSequence).toBe(4);
  });

  it('finishes the incident with its completion reason', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const draft = { actor: 'system' as const, type: 'budget_exhausted' as const, summary: 'out of time', refs: [] };
    await writer.update(incidentId, () => ({ ...draft, payload: { deadlineAt: 'now' } }));
    const snapshot = readSnapshot(writer.stateDir, incidentId);
    expect(snapshot?.incident).toMatchObject({ lifecycle: 'finished', completionReason: 'budget_exhausted', phase: 'handoff' });
  });
});
