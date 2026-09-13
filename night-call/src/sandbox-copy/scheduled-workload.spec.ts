import { sampleWith } from './samples.fixture';
import { runSchedule, type ScheduledRequest, type ScheduleRunner } from './scheduled-workload';

type Clock = { now: number; active: number; peak: number; sentAt: number[] };

function requestsAt(offsets: number[]): ScheduledRequest[] {
  return offsets.map((offsetMs, index) => ({ offsetMs, productIds: 'P', currencyCode: 'USD', sessionId: `s${index}` }));
}

async function ticks(count: number): Promise<void> {
  for (let tick = 0; tick < count; tick += 1) await Promise.resolve();
}

function clockRunner(options: { failAt?: number; busyTicks: number }): { clock: Clock; runner: ScheduleRunner } {
  const clock: Clock = { now: 0, active: 0, peak: 0, sentAt: [] };
  const runner: ScheduleRunner = {
    now: () => clock.now,
    wait: async (ms) => {
      clock.now += ms;
    },
    send: async (_request, index) => {
      clock.active += 1;
      clock.peak = Math.max(clock.peak, clock.active);
      clock.sentAt.push(clock.now);
      await ticks(options.busyTicks);
      clock.active -= 1;
      return sampleWith({ status: index === options.failAt ? 500 : 200 });
    },
    shouldStop: (sample) => sample.response.status !== 200,
  };
  return { clock, runner };
}

describe('scheduled workload', () => {
  it('sends each request at its offset divided by the speed factor', async () => {
    const { clock, runner } = clockRunner({ busyTicks: 0 });
    const samples = await runSchedule({ requests: requestsAt([2000, 0, 1000]), maxConcurrency: 1, speed: 2 }, runner);
    expect(clock.sentAt).toEqual([0, 500, 1000]);
    expect(samples).toHaveLength(3);
  });

  it('never has more requests in flight than the observed concurrency', async () => {
    const { clock, runner } = clockRunner({ busyTicks: 20 });
    const samples = await runSchedule({ requests: requestsAt(Array.from({ length: 12 }, () => 0)), maxConcurrency: 3, speed: 1 }, runner);
    expect(clock.peak).toBe(3);
    expect(samples).toHaveLength(12);
  });

  it('stops launching after a failure and lets requests already in flight finish', async () => {
    const { clock, runner } = clockRunner({ failAt: 0, busyTicks: 5 });
    const samples = await runSchedule({ requests: requestsAt(Array.from({ length: 10 }, () => 0)), maxConcurrency: 3, speed: 1 }, runner);
    expect(clock.sentAt).toHaveLength(3);
    expect(samples).toHaveLength(3);
    const paced = clockRunner({ failAt: 1, busyTicks: 0 });
    const pacedSamples = await runSchedule({ requests: requestsAt([0, 1000, 2000, 3000]), maxConcurrency: 1, speed: 1 }, paced.runner);
    expect(pacedSamples).toHaveLength(2);
    expect(paced.clock.sentAt).toEqual([0, 1000]);
    expect(paced.clock.now).toBeLessThanOrEqual(2000);
  });

  it('refuses a non-positive speed and surfaces a request that throws', async () => {
    const { runner } = clockRunner({ busyTicks: 0 });
    await expect(runSchedule({ requests: requestsAt([0]), maxConcurrency: 1, speed: 0 }, runner)).rejects.toThrow('speed must be positive');
    const broken = { ...runner, send: async () => Promise.reject(new Error('sandbox interrupted')) };
    await expect(runSchedule({ requests: requestsAt([0, 0]), maxConcurrency: 2, speed: 1 }, broken)).rejects.toThrow('sandbox interrupted');
  });
});
