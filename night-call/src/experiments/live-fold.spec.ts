import { appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { WorkloadSample } from '../sandbox-copy/stop-rules';
import { FRESH_WATCH, foldSamples } from './live-fold';
import { readLive } from './live-files';
import type { LiveProgress } from './live-progress-types';
import { LiveTracker } from './live-tracker';
import { followSamples } from './sample-follower';

function sample(index: number, change: { status?: number; restarts?: number; killed?: boolean } = {}): WorkloadSample {
  const observation = { memoryBytes: 64 * 1024 * 1024, limitBytes: 512 * 1024 * 1024, cpuPercent: 3, restarts: change.restarts ?? 0, state: { OOMKilled: change.killed ?? false }, image: 'i' };
  const response = { status: change.status ?? 200, products: 5, duration_ms: 40 };
  return { at: new Date(index * 1000).toISOString(), index, traceId: 't', productId: 'OLJCESPC7Z', response, observation, requestMs: 41 } as unknown as WorkloadSample;
}

const empty = { stage: 'replaying', stageAt: '', stages: [], requestsSent: 0, requestsPlanned: 20, errors: 0, speed: 1, trafficSource: 'traces', memoryMiB: { latest: null, limit: null }, oomKills: [], lastRequests: [] } as LiveProgress;

describe('live progress', () => {
  it('counts one kill for an out-of-memory flag followed by a restart and keeps the last 12 requests', () => {
    const samples = [...Array.from({ length: 13 }, (_, index) => sample(index + 1)), sample(14, { status: 503, killed: true }), sample(15, { restarts: 1 }), sample(16, { restarts: 2 })];
    const folded = foldSamples({ progress: empty, watch: FRESH_WATCH }, samples);
    expect(folded.progress.oomKills).toEqual([{ at: sample(14).at, atRequest: 14 }, { at: sample(16).at, atRequest: 16 }]);
    expect(folded.progress).toMatchObject({ requestsSent: 16, errors: 1, memoryMiB: { latest: 64, limit: 512 } });
    expect(folded.progress.lastRequests).toHaveLength(12);
    expect(folded.progress.lastRequests.at(-1)).toEqual({ at: sample(16).at, route: '/api/recommendations', productId: 'OLJCESPC7Z', status: 200, ms: 40 });
  });

  it('follows a growing samples file and marks replaying and the fault once', () => {
    const folder = mkdtempSync(join(tmpdir(), 'nc-live-'));
    const file = join(folder, 'exp-1.jsonl');
    appendFileSync(file, `${JSON.stringify(sample(1))}\n${JSON.stringify(sample(2)).slice(0, 20)}`);
    expect(followSamples(file).readNew()).toHaveLength(1);
    const path = join(folder, 'live', 'experiment-exp-1.json');
    const live = new LiveTracker({ path, speed: 1, trafficSource: 'traces' });
    live.mark('restarting', 'fault');
    live.follow({ runFolder: folder, name: 'exp-1', planned: 20, phase: 'fault' });
    appendFileSync(file, `\n${JSON.stringify(sample(3, { status: 500, killed: true }))}\n`);
    live.close();
    const progress = readLive(path);
    expect(progress.stages.map((mark) => [mark.stage, mark.detail])).toEqual([['restarting', 'fault'], ['replaying', 'fault'], ['fault_seen', 'fault']]);
    expect(progress).toMatchObject({ stage: 'fault_seen', requestsSent: 3, requestsPlanned: 20, errors: 1, oomKills: [{ atRequest: 3 }] });
  });
});
