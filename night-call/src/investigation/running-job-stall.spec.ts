import type { EventDraft } from './event-types';
import { liveSnapshot, STALL_AFTER_MS } from './live-snapshot';
import { appendAsRole } from './role-append';
import { leadStatus, recordedRun, snapshotOf, system } from './run.fixture';
import { appendAsService } from './service-append';

const runIds = { verificationRunId: 'vr-1', mitigationId: 'mit-1', contractId: 'contract-1' };
const recipe = { flagVariant: 'on', restart: true, count: 400, pacingMs: 200, stopOnFailure: true, speed: 1 };

const proofUntilRound: EventDraft[] = [
  system('contract_recorded', { contractId: 'contract-1', checks: [{ name: 'fault.oom_kills', comparator: 'gte', value: 1, unit: 'count' }] }),
  system('experiment_started', { experimentId: 'exp-1', kind: 'reproduction', hypothesisId: 'h', contractId: 'contract-1', purpose: 'p', recipe }),
  system('experiment_finished', { experimentId: 'exp-1', verdict: 'matches', checks: [{ name: 'fault.oom_kills', passed: true, observed: 1 }], seriesRef: null }),
  system('experiment_reviewed', { experimentId: 'exp-1', accepted: true, reasons: ['1 kill'] }),
  system('mitigation_proposed', { mitigationId: 'mit-1', explanation: 'flag off', diff: '-on\n+off', caveats: [], notFixed: 'n', variant: 'off', restart: true }),
  system('verification_started', runIds),
  system('cycle_started', { ...runIds, cycle: 1, speed: 2 }),
];

describe('stall with a running proof job', () => {
  it('keeps a quiet run running while a round runs, and marks it stalled once the round is over and quiet', async () => {
    const { writer, incidentId } = await recordedRun([]);
    await appendAsRole(writer, { role: 'lead', incidentId, body: leadStatus('working') });
    for (const draft of proofUntilRound) await appendAsService(writer, { incidentId, draft });
    const running = snapshotOf(writer, incidentId);
    const quietLater = Date.parse(String(running.lastAgentActivityAt)) + 2 * STALL_AFTER_MS;
    const duringRound = liveSnapshot(running, quietLater);
    expect(duringRound.investigation).toBe('running');
    expect(duringRound.runReport).toMatchObject({ status: 'running', nowDoing: 'Lead working' });
    const finished = system('cycle_finished', { ...runIds, cycle: 1, speed: 2, passed: true, checks: [] });
    await appendAsService(writer, { incidentId, draft: finished });
    const afterRound = snapshotOf(writer, incidentId);
    expect(afterRound.lastAgentActivityAt).not.toBe(running.lastAgentActivityAt);
    const idle = liveSnapshot(afterRound, Date.parse(String(afterRound.lastAgentActivityAt)) + STALL_AFTER_MS);
    expect(idle.investigation).toBe('stalled');
    expect(liveSnapshot(afterRound, Date.parse(String(afterRound.lastAgentActivityAt)) + STALL_AFTER_MS - 1000).investigation).toBe('running');
  });
});
