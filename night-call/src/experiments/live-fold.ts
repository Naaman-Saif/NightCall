import type { WorkloadSample } from '../sandbox-copy/stop-rules';
import { MAX_LAST_REQUESTS, MAX_OOM_KILLS, type LiveProgress, type LiveRequest, type OomKill } from './live-progress-types';

export type KillWatch = { restarts: number | null; killedFlag: boolean; awaitingRestart: boolean };
export type FoldState = { progress: LiveProgress; watch: KillWatch };
export type FoldResult = FoldState & { killSeen: boolean };

export const FRESH_WATCH: KillWatch = { restarts: null, killedFlag: false, awaitingRestart: false };

const BYTES_PER_MIB = 1024 * 1024;

function mib(bytes: number | null): number | null {
  return bytes === null ? null : Math.round((bytes / BYTES_PER_MIB) * 10) / 10;
}

function requestOf(sample: WorkloadSample): LiveRequest {
  const ms = sample.response.duration_ms ?? sample.requestMs ?? null;
  return { at: sample.at, route: '/api/recommendations', productId: sample.productId ?? null, status: sample.response.status, ms };
}

export function nextWatch(watch: KillWatch, sample: WorkloadSample): { watch: KillWatch; kill: boolean } {
  const killedFlag = sample.observation.state?.OOMKilled === true;
  const restarts = sample.observation.restarts;
  const restarted = watch.restarts !== null && restarts > watch.restarts;
  const flagged = killedFlag && !watch.killedFlag && !restarted;
  const kill = flagged || (restarted && !watch.awaitingRestart);
  const awaitingRestart = flagged || (watch.awaitingRestart && !restarted);
  return { watch: { restarts, killedFlag, awaitingRestart }, kill };
}

export function withKill(progress: LiveProgress, kill: OomKill): LiveProgress {
  return { ...progress, oomKills: [...progress.oomKills, kill].slice(-MAX_OOM_KILLS) };
}

function withRequest(progress: LiveProgress, sample: WorkloadSample): LiveProgress {
  const latest = mib(sample.observation.memoryBytes) ?? progress.memoryMiB.latest;
  const limit = mib(sample.observation.limitBytes) ?? progress.memoryMiB.limit;
  const errors = progress.errors + (sample.response.status === 200 ? 0 : 1);
  const lastRequests = [...progress.lastRequests, requestOf(sample)].slice(-MAX_LAST_REQUESTS);
  return { ...progress, requestsSent: Math.max(progress.requestsSent, sample.index), errors, memoryMiB: { latest, limit }, lastRequests };
}

export function foldSamples(state: FoldState, samples: WorkloadSample[]): FoldResult {
  let { progress, watch } = state;
  let killSeen = false;
  for (const sample of samples) {
    const next = nextWatch(watch, sample);
    if (next.kill) progress = withKill(progress, { at: sample.at, atRequest: sample.index });
    killSeen = killSeen || next.kill;
    watch = next.watch;
    progress = withRequest(progress, sample);
  }
  return { progress, watch, killSeen };
}
