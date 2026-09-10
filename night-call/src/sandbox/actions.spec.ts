import { candidateNeedsAHuman } from './actions';

describe('candidates', () => {
  it('lets a revert to a healthy value run without a human', () => {
    expect(candidateNeedsAHuman({ action: 'revert_flag', target: 'paymentFailure', rationale: '' })).toBe(false);
    expect(candidateNeedsAHuman({ action: 'restart_service', target: 'payment', rationale: '' })).toBe(false);
  });

  it('holds back any novel value', () => {
    expect(candidateNeedsAHuman({ action: 'set_flag', target: 'paymentFailure', value: '10%', rationale: '' })).toBe(true);
  });
});
