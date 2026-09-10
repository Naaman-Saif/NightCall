import { flagChangesBetween, flagStatesOf } from './config-diff';

const healthy = flagStatesOf({
  flags: {
    paymentFailure: { defaultVariant: 'off' },
    adHighCpu: { defaultVariant: 'off' },
  },
});

describe('config diff', () => {
  it('reports the flag that moved and nothing else', () => {
    const broken = { ...healthy, paymentFailure: '100%' };
    expect(flagChangesBetween(healthy, broken)).toEqual([{ flag: 'paymentFailure', from: 'off', to: '100%' }]);
  });

  it('reports an empty diff for identical configs', () => {
    expect(flagChangesBetween(healthy, { ...healthy })).toEqual([]);
  });

  it('treats a removed flag as absent', () => {
    const withoutAd = Object.fromEntries(Object.entries(healthy).filter(([flag]) => flag !== 'adHighCpu'));
    expect(flagChangesBetween(healthy, withoutAd)).toEqual([{ flag: 'adHighCpu', from: 'off', to: 'absent' }]);
  });
});
