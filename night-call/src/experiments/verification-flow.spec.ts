import { BadRequestException, ConflictException, UnprocessableEntityException } from '@nestjs/common';

import { readSnapshot } from '../investigation/incident-catalog';
import { closeExpiredIncident, expiredIncidents } from './deadline-watch';
import { JobRegistry } from './job-registry';
import { proposeMitigation } from './mitigation-proposal';
import { fakeVerificationOwner, flagText, incidentWithReproduction } from './proof.fixture';
import { reviewVerification } from './verification-review';
import { startVerification } from './verification-start';

const mitigation = { variant: 'off', restart: true, explanation: 'Turn the cache flag off', caveats: [], notFixed: 'The cache has no size limit' };
const approve = { approved: true, reasons: ['3 of 3 rounds passed'] };

async function verifiedRun(failingRound: string | null) {
  const { writer, incidentId } = await incidentWithReproduction();
  const { mitigationId } = await proposeMitigation(writer, { incidentId, body: mitigation, flagText });
  const registry = new JobRegistry();
  const deps = { writer, registry, owner: fakeVerificationOwner(failingRound) };
  const started = await startVerification(deps, { incidentId, body: { mitigationId, contractId: 'contract-1' } });
  const job = await registry.waitFor({ jobId: started.jobId, waitSeconds: 5, stop: new AbortController().signal });
  return { writer, incidentId, started, job };
}

describe('mitigation route', () => {
  it('builds a one-line diff from the reproduced variant to the proposed one', async () => {
    const { writer, incidentId } = await incidentWithReproduction();
    const { mitigationId, diff } = await proposeMitigation(writer, { incidentId, body: mitigation, flagText });
    expect(mitigationId).toBe('mit-1');
    expect(diff.split('\n')).toEqual(['--- a/src/flagd/demo.flagd.json', '+++ b/src/flagd/demo.flagd.json', '@@ -4 +4 @@', '-      "defaultVariant": "on",', '+      "defaultVariant": "off",']);
    expect(readSnapshot(writer.stateDir, incidentId)?.mitigation).toMatchObject({ id: 'mit-1', variant: 'off', restart: true, status: 'proposed' });
  });

  it('refuses without an accepted reproduction, an unknown variant and the fault variant', async () => {
    const unaccepted = await incidentWithReproduction(false);
    const refused = proposeMitigation(unaccepted.writer, { incidentId: unaccepted.incidentId, body: mitigation, flagText });
    await expect(refused).rejects.toEqual(new ConflictException({ code: 'no_accepted_reproduction' }));
    const { writer, incidentId } = await incidentWithReproduction();
    const unknown = proposeMitigation(writer, { incidentId, body: { ...mitigation, variant: 'maybe' }, flagText });
    await expect(unknown).rejects.toEqual(new BadRequestException({ code: 'unknown_variant' }));
    const same = proposeMitigation(writer, { incidentId, body: { ...mitigation, variant: 'on' }, flagText });
    await expect(same).rejects.toEqual(new BadRequestException({ code: 'same_as_fault' }));
  });
});

describe('verification route', () => {
  it('passes 3 of 3 rounds at 2x speed and accepts the approval', async () => {
    const { writer, incidentId, started, job } = await verifiedRun(null);
    expect(job).toMatchObject({ kind: 'verification', state: 'finished', result: { verdict: 'matches', verificationRunId: started.verificationRunId } });
    const cycles = readSnapshot(writer.stateDir, incidentId)?.cycles ?? [];
    expect(cycles.map((cycle) => [cycle.state, cycle.speed])).toEqual([['passed', 2], ['passed', 2], ['passed', 2]]);
    await reviewVerification(writer, { incidentId, runId: started.verificationRunId, body: approve });
    expect(readSnapshot(writer.stateDir, incidentId)?.mitigation?.status).toBe('verified');
  });

  it('ends the run at the first failed round and refuses approval and a stale run', async () => {
    const { writer, incidentId, started, job } = await verifiedRun('-c2-mitigated');
    expect(job).toMatchObject({ state: 'finished', result: { verdict: 'differs' } });
    const cycles = readSnapshot(writer.stateDir, incidentId)?.cycles ?? [];
    expect(cycles.map((cycle) => cycle.state)).toEqual(['passed', 'failed', 'pending']);
    const approval = reviewVerification(writer, { incidentId, runId: started.verificationRunId, body: approve });
    await expect(approval).rejects.toEqual(new UnprocessableEntityException({ code: 'not_three_passed' }));
    const stale = reviewVerification(writer, { incidentId, runId: 'vr-old', body: approve });
    await expect(stale).rejects.toEqual(new ConflictException({ code: 'run_not_current' }));
  });
});

describe('deadline watch', () => {
  it('closes an expired incident so tools answer with a conflict', async () => {
    const { writer, incidentId } = await incidentWithReproduction();
    const expired = expiredIncidents(writer.stateDir, Date.now() + 31 * 60_000);
    expect(expired.map((snapshot) => snapshot.incident.id)).toEqual([incidentId]);
    await closeExpiredIncident(writer, expired[0]);
    expect(readSnapshot(writer.stateDir, incidentId)?.incident).toMatchObject({ lifecycle: 'finished', completionReason: 'budget_exhausted' });
    await expect(proposeMitigation(writer, { incidentId, body: mitigation, flagText })).rejects.toBeInstanceOf(ConflictException);
  });
});
