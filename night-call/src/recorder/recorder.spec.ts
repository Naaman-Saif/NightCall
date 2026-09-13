import { memoryInUse } from './memory-usage';
import { Recorder } from './recorder';
import { FakeSource, statsOf } from './recorder.fixture';
import { SAMPLES_PER_SERVICE } from './service-tracks';

function sourceWithTwoServices(): FakeSource {
  const source = new FakeSource();
  source.readings.set('recommendation', { usage: 60, inactive: 10, limitBytes: 500, cpuTotal: 100, systemTotal: 1000 });
  source.readings.set('night-call', { usage: 80, inactive: 0, limitBytes: null, cpuTotal: 50, systemTotal: 1000 });
  return source;
}

describe('recorder', () => {
  it('stores memory minus inactive file, the limit or null, and CPU from the second sample', async () => {
    const source = sourceWithTwoServices();
    const recorder = new Recorder(source);
    await recorder.tick();
    source.readings.set('recommendation', { usage: 70, inactive: 10, limitBytes: 500, cpuTotal: 200, systemTotal: 2000 });
    await recorder.tick();
    const [first, second] = recorder.tracks.windowOf('recommendation');
    expect(first).toMatchObject({ memoryBytes: 50, limitBytes: 500, cpuPercent: null });
    expect(second).toMatchObject({ memoryBytes: 60, cpuPercent: 20 });
    expect(recorder.tracks.windowOf('night-call')[0].limitBytes).toBeNull();
  });

  it('keeps at most 180 samples per service', async () => {
    const recorder = new Recorder(sourceWithTwoServices());
    for (let tick = 0; tick < SAMPLES_PER_SERVICE + 5; tick += 1) await recorder.tick();
    expect(recorder.tracks.windowOf('recommendation')).toHaveLength(SAMPLES_PER_SERVICE);
  });

  it('skips a tick while the previous one is still running', async () => {
    const source = sourceWithTwoServices();
    let release = () => undefined as void;
    source.pause = new Promise<void>((resolve) => (release = resolve));
    const recorder = new Recorder(source);
    const slow = recorder.tick();
    expect(await recorder.tick()).toBeNull();
    release();
    expect(await slow).toHaveLength(2);
  });

  it('skips a service whose stats call fails and keeps the others', async () => {
    const source = sourceWithTwoServices();
    source.failing.add('night-call');
    const samples = await new Recorder(source).tick();
    expect(samples?.map((sample) => sample.service)).toEqual(['recommendation']);
  });

  it('treats missing usage as unknown memory', () => {
    expect(memoryInUse({ memory_stats: {} } as never)).toBeNull();
    expect(memoryInUse(statsOf({ usage: 5, inactive: 9, limitBytes: null, cpuTotal: 0, systemTotal: 0 }))).toBe(0);
  });
});
