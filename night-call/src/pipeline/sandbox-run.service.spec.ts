import type { Candidate } from '../sandbox/actions';
import type { SandboxFacade } from '../sandbox/sandbox.facade';
import { SandboxRunService } from './sandbox-run.service';

const revert: Candidate = { action: 'revert_flag', target: 'paymentFailure', rationale: 'put it back' };
const restart: Candidate = { action: 'restart_service', target: 'payment', rationale: 'bounce it' };
const failing = { checkout_http_status: 422 };

function fakeSandbox(cloneBaseline: object, reproduced: boolean) {
  const calls: string[] = [];
  const facade = {
    clone: { up: async () => { calls.push('up'); return cloneBaseline; }, down: async () => { calls.push('down'); } },
    replay: { reproduce: async () => ({ baseline: cloneBaseline, afterReplay: failing, production: failing, reproduced }) },
    trial: { run: async (candidate: Candidate) => ({ candidate, verdict: 'cleared' as const, before: failing, after: {}, note: '' }) },
  };
  return { service: new SandboxRunService(facade as unknown as SandboxFacade), calls };
}

const input = (candidates: Candidate[]) => ({ diff: [{ flag: 'paymentFailure', from: 'off', to: '100%' }], production: failing, candidates, knownGood: { paymentFailure: 'off' } });

describe('sandbox run', () => {
  it('skips the clone entirely when there is no diff to replay', async () => {
    const { service, calls } = fakeSandbox({}, true);
    const out = await service.run({ ...input([revert]), diff: [] });
    expect(calls).toEqual([]);
    expect(out.reproduction).toBeUndefined();
    expect(out.trials[0].verdict).toBe('untried');
  });

  it('always tears the clone down and stops trialling after the first cleared candidate', async () => {
    const { service, calls } = fakeSandbox({}, true);
    const out = await service.run(input([revert, restart]));
    expect(calls).toEqual(['up', 'down']);
    expect(out.trials.map((t) => t.verdict)).toEqual(['cleared', 'untried']);
  });

  it('marks candidates untried when the failure did not reproduce', async () => {
    const { service } = fakeSandbox({}, false);
    const out = await service.run(input([revert]));
    expect(out.reproduction?.reproduced).toBe(false);
    expect(out.trials[0].note).toBe('not reproduced');
  });

  it('refuses to replay into a clone that never went green', async () => {
    const { service, calls } = fakeSandbox({ container_kafka: -1 }, true);
    const out = await service.run(input([revert]));
    expect(calls).toEqual(['up', 'down']);
    expect(out.reproduction).toBeUndefined();
    expect(out.trials[0].note).toContain('never went green');
  });
});
