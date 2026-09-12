import { observationWith, sampleWith } from './samples.fixture';
import { summarizeWorkload, workloadIsHealthy } from './workload-summary';

describe('workload summary', () => {
  const before = observationWith({ limitBytes: 524288000 });

  it('counts errors, empty responses and peaks', () => {
    const empty = sampleWith({ observation: { memoryBytes: 3000, cpuPercent: null } });
    empty.response.products = 0;
    const samples = [sampleWith({ observation: { cpuPercent: 40 } }), empty, sampleWith({ status: 500 })];
    const summary = summarizeWorkload({ samples, before, after: observationWith({ restarts: 1 }), elapsedMs: 90_000 });
    expect(summary).toMatchObject({
      count: 3, errors: 1, emptyResponses: 1, peakMemoryBytes: 3000, peakCpuPercent: 40,
      limitBytes: 524288000, restartsBefore: 0, restartsAfter: 1, elapsedSeconds: 90, elapsedMinutes: 1.5,
    });
    expect(workloadIsHealthy(summary, 3)).toBe(false);
  });

  it('calls a full clean run healthy', () => {
    const samples = [sampleWith({}), sampleWith({})];
    const summary = summarizeWorkload({ samples, before, after: before, elapsedMs: 1000 });
    expect(workloadIsHealthy(summary, 2)).toBe(true);
    expect(workloadIsHealthy(summary, 3)).toBe(false);
  });

  it('is not healthy when the restart count changed', () => {
    const summary = summarizeWorkload({ samples: [sampleWith({})], before, after: observationWith({ restarts: 2 }), elapsedMs: 1 });
    expect(workloadIsHealthy(summary, 1)).toBe(false);
  });

  it('has no peak without readings', () => {
    const summary = summarizeWorkload({ samples: [], before, after: before, elapsedMs: 0 });
    expect(summary.peakMemoryBytes).toBeNull();
    expect(summary.startedAt).toBeNull();
  });
});
