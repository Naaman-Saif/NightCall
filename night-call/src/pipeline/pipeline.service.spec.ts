import type { Incident } from '../incidents/incident';
import { PipelineService } from './pipeline.service';
import type { PipelineDeps } from './pipeline.deps';

jest.mock('@strands-agents/sdk', () => ({ Agent: class {}, BedrockModel: class {}, BeforeToolCallEvent: class {}, tool: () => ({}) }));
jest.mock('../report/github', () => ({ fileIssue: jest.fn(async () => ({ url: 'https://github.com/o/r/issues/7', number: 7 })) }));
jest.mock('../evidence/last-green', () => ({ readLastGreen: jest.fn() }));
jest.mock('../evidence/config-diff', () => ({ ...jest.requireActual('../evidence/config-diff'), readFlagStates: jest.fn() }));
jest.mock('./run-record', () => ({ writeRunRecord: jest.fn((bundle, issueUrl) => ({ bundle, issueUrl })) }));

import { readFlagStates } from '../evidence/config-diff';
import { readLastGreen } from '../evidence/last-green';
import { fileIssue } from '../report/github';
import { writeRunRecord } from './run-record';

const incident: Incident = {
  id: 'i1', key: 'payment/PaymentErrorRateHigh', status: 'running', receivedAt: '2026-09-11T03:14:02Z',
  alert: { name: 'PaymentErrorRateHigh', service: 'payment', firedAt: '2026-09-11T03:14:02Z', summary: '' },
};

function fakeDeps() {
  const calls: Record<string, unknown[]> = {};
  const remember = (name: string) => (...args: unknown[]) => { calls[name] = args; return undefined; };
  const deps = {
    probes: { signature: async () => ({ checkout_http_status: 422 }) },
    triage: { run: async (...a: unknown[]) => { remember('triage')(...a); return { service: 'payment', cause: 'flag', confidence: 'high', evidence: [] }; } },
    remediator: { run: async () => [{ action: 'revert_flag', target: 'paymentFailure', rationale: 'back' }] },
    sandbox: { run: async (...a: unknown[]) => { remember('sandbox')(...a); return { reproduction: { baseline: {}, afterReplay: { checkout_http_status: 422 }, production: { checkout_http_status: 422 }, reproduced: true }, trials: [] }; } },
    reporter: { write: async (...a: unknown[]) => { remember('reporter')(...a); return { title: 'payment: t', body: 'b' }; } },
  };
  return { deps: deps as unknown as PipelineDeps, calls };
}

describe('pipeline', () => {
  beforeEach(() => jest.clearAllMocks());

  it('skips an incident when no green snapshot exists yet', async () => {
    (readLastGreen as jest.Mock).mockReturnValue(undefined);
    const { deps, calls } = fakeDeps();
    await new PipelineService(deps).run(incident);
    expect(calls.triage).toBeUndefined();
    expect(fileIssue).not.toHaveBeenCalled();
  });

  it('diffs against the snapshot, runs the sandbox, files the issue and records the run', async () => {
    (readLastGreen as jest.Mock).mockReturnValue({ takenAt: 't', flags: { paymentFailure: 'off' } });
    (readFlagStates as jest.Mock).mockReturnValue({ paymentFailure: '100%' });
    const { deps, calls } = fakeDeps();
    await new PipelineService(deps).run(incident);
    const diff = [{ flag: 'paymentFailure', from: 'off', to: '100%' }];
    expect(calls.triage).toEqual([incident, diff]);
    expect((calls.sandbox as [{ diff: unknown; knownGood: unknown }])[0]).toMatchObject({ diff, knownGood: { paymentFailure: 'off' } });
    expect(fileIssue).toHaveBeenCalledWith('payment: t', 'b');
    expect(writeRunRecord).toHaveBeenCalledWith(expect.objectContaining({ incident, diff }), 'https://github.com/o/r/issues/7');
  });
});
