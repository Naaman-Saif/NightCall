import { cpuPercent } from './cpu-percent';

const first = { containerTotal: 1_000_000_000, systemTotal: 100_000_000_000, onlineCpus: 16 };

describe('cpu percent from two samples', () => {
  it('has no value for the first sample', () => {
    expect(cpuPercent({ previous: null, current: first })).toBeNull();
  });

  it('divides the container change by the system change, times online cpus', () => {
    const current = { containerTotal: 2_000_000_000, systemTotal: 116_000_000_000, onlineCpus: 16 };
    expect(cpuPercent({ previous: first, current })).toBe(100);
  });

  it('reads a quarter core as 25 percent', () => {
    const current = { containerTotal: 1_250_000_000, systemTotal: 116_000_000_000, onlineCpus: 16 };
    expect(cpuPercent({ previous: first, current })).toBe(25);
  });

  it('counts usage since a restart when the container counter went back', () => {
    const current = { containerTotal: 500_000_000, systemTotal: 116_000_000_000, onlineCpus: 16 };
    expect(cpuPercent({ previous: first, current })).toBe(50);
  });

  it('reads a stopped container as zero', () => {
    const current = { containerTotal: 0, systemTotal: 0, onlineCpus: 1 };
    expect(cpuPercent({ previous: first, current })).toBe(0);
  });
});
