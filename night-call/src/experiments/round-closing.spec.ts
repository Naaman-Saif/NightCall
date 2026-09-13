import { readSnapshot } from '../investigation/incident-catalog';
import { appendAsService } from '../investigation/service-append';
import { closeExpiredIncident } from './deadline-watch';
import { proposeMitigation } from './mitigation-proposal';
import { flagText, incidentWithReproduction } from './proof.fixture';

const mitigation = { variant: 'off', restart: true, explanation: 'Turn the cache flag off', caveats: [], notFixed: 'No size limit' };

describe('round closing', () => {
  it('fails a running round and returns the mitigation to proposed when the budget runs out', async () => {
    const { writer, incidentId } = await incidentWithReproduction();
    const { mitigationId } = await proposeMitigation(writer, { incidentId, body: mitigation, flagText });
    const runIds = { verificationRunId: 'vr-1', mitigationId, contractId: 'contract-1' };
    const system = (type: 'verification_started' | 'cycle_started', payload: Record<string, unknown>) => ({ actor: 'system' as const, type, summary: type, refs: [], payload });
    await appendAsService(writer, { incidentId, draft: system('verification_started', runIds) });
    await appendAsService(writer, { incidentId, draft: system('cycle_started', { ...runIds, cycle: 1, speed: 2 }) });
    await closeExpiredIncident(writer, readSnapshot(writer.stateDir, incidentId)!);
    const snapshot = readSnapshot(writer.stateDir, incidentId);
    expect(snapshot?.cycles.map((cycle) => cycle.state)).toEqual(['failed', 'pending', 'pending']);
    expect(snapshot?.mitigation?.status).toBe('proposed');
    expect(snapshot?.incident.completionReason).toBe('budget_exhausted');
  });
});
