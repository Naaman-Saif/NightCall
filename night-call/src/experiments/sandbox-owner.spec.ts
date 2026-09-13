import { LiveStream } from '../investigation/live-stream';
import type { IncidentEvent } from '../investigation/event-types';
import type { TrafficRecipe } from '../production/traffic-recipe-types';
import { repeatedRecipe } from './capped-recipe';
import { SandboxOwner } from './sandbox-owner';
import type { WorkerCommandBody } from './worker-messages';
import type { WorkerProcess } from './worker-process';

function fakeWorker() {
  const commands: string[] = [];
  let stopped = 0;
  const worker = {
    listen: () => undefined,
    request: (body: WorkerCommandBody) => {
      commands.push(body.command);
      return new Promise((resolve) => setTimeout(() => resolve({ runFolder: `/runs/${commands.length}` }), 10));
    },
    stop: () => {
      stopped += 1;
      return Promise.resolve(143);
    },
  } as unknown as WorkerProcess;
  return { worker, commands, stops: () => stopped };
}

describe('sandbox owner', () => {
  it('reuses one warm start when an experiment arrives during warm-up, and stops on the incident ending', async () => {
    const stream = new LiveStream();
    const fake = fakeWorker();
    const owner = new SandboxOwner(stream, () => fake.worker);
    await owner.workerFor('inc-1');
    const warming = owner.warmUp('inc-1');
    expect(owner.isWarmFor('inc-1')).toBe(true);
    expect(await owner.workerFor('inc-1')).toBe(fake.worker);
    const [first, second] = await Promise.all([warming, owner.warmUp('inc-1')]);
    expect(first).toBe(second);
    expect(fake.commands).toEqual(['start']);
    stream.publish({ incidentId: 'inc-1', type: 'investigation_stopped' } as IncidentEvent);
    await new Promise((resolve) => setImmediate(resolve));
    expect(fake.stops()).toBe(1);
    expect(owner.isWarmFor('inc-1')).toBe(false);
  });

  it('loops the recipe offsets until the mitigation request count is reached', () => {
    const request = (offsetMs: number) => ({ offsetMs, productIds: 'p', currencyCode: 'USD', sessionId: 's', caller: 'browser' as const });
    const recipe = { source: 'traces', requests: [request(0), request(1000), request(2000)] } as TrafficRecipe;
    const repeated = repeatedRecipe(recipe, 7).requests.map((item) => item.offsetMs);
    expect(repeated).toEqual([0, 1000, 2000, 2667, 3667, 4667, 5334]);
  });
});
