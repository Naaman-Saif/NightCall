import type { EvidenceBundle } from '../pipeline/evidence-bundle';
import { renderIssueBody } from './issue-template';

const bundle: EvidenceBundle = {
  incident: {
    id: 'i1', key: 'payment/PaymentErrorRateHigh', status: 'running', receivedAt: '2026-09-11T03:14:02Z',
    alert: { name: 'PaymentErrorRateHigh', service: 'payment', firedAt: '2026-09-11T03:14:02Z', summary: '' },
  },
  diff: [{ flag: 'paymentFailure', from: 'off', to: '100%' }],
  hypothesis: { service: 'payment', cause: 'flag moved', confidence: 'high', evidence: ['paymentFailure off -> 100%'] },
  reproduction: { baseline: {}, afterReplay: { checkout_http_status: 422 }, production: { checkout_http_status: 422 }, reproduced: true },
  trials: [
    { candidate: { action: 'revert_flag', target: 'paymentFailure', rationale: 'put it back' }, verdict: 'cleared', before: { checkout_http_status: 422 }, after: {}, note: '3 looks over 80s' },
    { candidate: { action: 'set_flag', target: 'paymentFailure', value: '10%', rationale: 'partial' }, verdict: 'needs_human', before: {}, after: {}, note: '' },
  ],
};

describe('issue body', () => {
  it('carries every section a human needs, in order', () => {
    const body = renderIssueBody(bundle, { title: 't', hypothesisSection: 'The flag moved.', nextStep: 'Revert it.' });
    const order = ['## Alert', '## Hypothesis', '## Reproduction in sandbox', '## Fix candidates', '## Needs a human', '## Diff replayed', '## Next step'];
    const positions = order.map((h) => body.indexOf(h));
    expect(positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1]))).toBe(true);
    expect(body).toContain('Matches production signature: **yes**');
    expect(body).toContain('`revert_flag(paymentFailure)` : **cleared**');
    expect(body).toContain('`set_flag(paymentFailure, 10%)`: partial');
  });
});
