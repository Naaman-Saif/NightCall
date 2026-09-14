import { countWords } from './count-words';
import type { EventDraft } from './event-types';
import { readSnapshot } from './incident-catalog';
import { appendAsRole } from './role-append';
import { stopBody, system } from './run.fixture';
import { appendAsService } from './service-append';
import { freshWriter, impactQuestion, openIncident, toolBody } from './writer.fixture';

const runIds = { verificationRunId: 'vr-1', mitigationId: 'mit-1', contractId: 'contract-1' };
const recipe = { flagVariant: 'on', restart: true, count: 400, pacingMs: 200, stopOnFailure: true, speed: 1 };
const hypothesis = { hypothesisId: 'h-1', claim: 'The cache flag grows memory', supportingEvidenceIds: [], contradictingEvidenceIds: [], predicted: 'OOM with the flag on' };

const reproduction: EventDraft[] = [
  system('contract_recorded', { contractId: 'contract-1', checks: [{ name: 'fault.oom_kills', comparator: 'gte', value: 1, unit: 'count' }] }),
  system('experiment_started', { experimentId: 'exp-1', kind: 'reproduction', hypothesisId: 'h-1', contractId: 'contract-1', purpose: 'p', recipe }),
  system('experiment_finished', { experimentId: 'exp-1', verdict: 'matches', checks: [{ name: 'fault.oom_kills', passed: true, observed: 1 }, { name: 'fault.http_failures', passed: true, observed: 1 }], seriesRef: null }),
  system('experiment_reviewed', { experimentId: 'exp-1', accepted: true, reasons: ['1 kill'] }),
];

const verification: EventDraft[] = [
  system('mitigation_proposed', { mitigationId: 'mit-1', explanation: 'flag off', diff: '-on\n+off', caveats: [], notFixed: 'n', variant: 'off', restart: true }),
  system('verification_started', runIds),
  ...[1, 2, 3].flatMap((cycle) => [system('cycle_started', { ...runIds, cycle }), system('cycle_finished', { ...runIds, cycle, passed: true, checks: [] })]),
  { ...system('verification_reviewed', { ...runIds, approved: true, reasons: ['3 of 3'] }), actor: 'verifier' },
];

async function appendAll(writer: ReturnType<typeof freshWriter>, request: { incidentId: string; drafts: EventDraft[] }): Promise<void> {
  for (const draft of request.drafts) await appendAsService(writer, { incidentId: request.incidentId, draft });
}

describe('proof status and unanswered questions', () => {
  it('sets reproduced then verified from proof events and closes an unanswered question when the run stops', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    await appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('hypothesis_proposed', hypothesis) });
    await appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('question_asked', impactQuestion) });
    await appendAll(writer, { incidentId, drafts: reproduction });
    const reproduced = readSnapshot(writer.stateDir, incidentId);
    expect(reproduced?.hypotheses[0].status).toBe('reproduced');
    expect(reproduced?.runReport.did.at(-1)?.value).toBe('With test traffic: 1 out-of-memory kill, 1 failed request');
    await appendAll(writer, { incidentId, drafts: verification });
    await appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('hypothesis_status_changed', { hypothesisId: 'h-1', status: 'testing', reason: 'late' }) });
    expect(readSnapshot(writer.stateDir, incidentId)?.runReport.causes[0].status).toBe('verified');
    await appendAsRole(writer, { role: 'lead', incidentId, body: stopBody('no_answer') });
    const stopped = readSnapshot(writer.stateDir, incidentId);
    expect(stopped?.hypotheses[0].status).toBe('verified');
    expect(stopped?.incident.attention).toBe('no_answer');
    expect(stopped?.questions[0]).toMatchObject({ id: 'q-impact', answer: null, status: 'no_answer' });
    expect(stopped?.runReport.did.find((step) => step.questionId === 'q-impact')?.value).toBe('No answer');
  });

  it('counts in singular and plural', () => {
    expect([countWords(1, 'out-of-memory kill'), countWords(2, 'failed request'), countWords(0, 'restart'), countWords('not measured', 'out-of-memory kill')]).toEqual([
      '1 out-of-memory kill', '2 failed requests', '0 restarts', 'out-of-memory kills not measured',
    ]);
  });
});
