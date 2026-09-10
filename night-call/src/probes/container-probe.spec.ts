import { cpuPercentOf } from './container-probe';

describe('cpu percent from docker stats', () => {
  it('matches the docker stats formula', () => {
    const stats = {
      cpu_stats: { cpu_usage: { total_usage: 2_000_000_000 }, system_cpu_usage: 10_000_000_000, online_cpus: 8 },
      precpu_stats: { cpu_usage: { total_usage: 1_000_000_000 }, system_cpu_usage: 8_000_000_000 },
    };
    expect(cpuPercentOf(stats)).toBe(400);
  });

  it('reads zero on the first sample', () => {
    const stats = { cpu_stats: { cpu_usage: { total_usage: 5 }, system_cpu_usage: 0 }, precpu_stats: { cpu_usage: { total_usage: 0 }, system_cpu_usage: 0 } };
    expect(cpuPercentOf(stats)).toBe(0);
  });
});
