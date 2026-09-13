import { join } from 'node:path';

import { FRESH_WATCH, foldSamples, withKill, type KillWatch } from './live-fold';
import { writeLive } from './live-files';
import { MAX_STAGES, type LivePhase, type LiveProgress, type LiveStage } from './live-progress-types';
import { followSamples, type SampleFollower } from './sample-follower';
import type { RoundOutcome } from './worker-messages';

export type LiveTarget = { path: string; speed: number; trafficSource: string | null };
export type LivePhaseStart = { runFolder: string; name: string; planned: number; phase: LivePhase };
type Following = { follower: SampleFollower; phase: LivePhase; replaying: boolean; faultSeen: boolean; watch: KillWatch };

const WRITE_EVERY_MS = 1000;

function emptyProgress(target: LiveTarget): LiveProgress {
  const at = new Date().toISOString();
  const counts = { requestsSent: 0, requestsPlanned: 0, errors: 0, memoryMiB: { latest: null, limit: null }, oomKills: [], lastRequests: [] };
  return { stage: 'starting_copy', stageAt: at, stages: [], speed: target.speed, trafficSource: target.trafficSource, ...counts };
}

export class LiveTracker {
  private progress: LiveProgress;
  private following: Following | null = null;
  private readonly timer: NodeJS.Timeout;

  constructor(private readonly target: LiveTarget) {
    this.progress = emptyProgress(target);
    this.timer = setInterval(() => this.flush(), WRITE_EVERY_MS);
    this.timer.unref();
  }

  mark(stage: LiveStage, detail: string | null = null): void {
    const at = new Date().toISOString();
    const stages = [...this.progress.stages, { stage, at, detail }];
    this.progress = { ...this.progress, stage, stageAt: at, stages: stages.length > MAX_STAGES ? [stages[0], ...stages.slice(-(MAX_STAGES - 1))] : stages };
    writeLive(this.target.path, this.progress);
  }

  follow(start: LivePhaseStart): void {
    this.flush();
    const follower = followSamples(join(start.runFolder, `${start.name}.jsonl`));
    this.following = { follower, phase: start.phase, replaying: false, faultSeen: false, watch: FRESH_WATCH };
    this.progress = { ...this.progress, requestsSent: 0, requestsPlanned: start.planned, errors: 0, lastRequests: [] };
  }

  roundDone(outcome: RoundOutcome): void {
    this.flush(true);
    const following = this.following;
    if (!following || following.faultSeen || outcome.oomEvents.length === 0) return;
    for (const event of outcome.oomEvents) this.progress = withKill(this.progress, { at: event.at, atRequest: outcome.summary.firstFailureRequest });
    following.faultSeen = true;
    this.mark('fault_seen', following.phase);
  }

  flush(finished = false): void {
    const following = this.following;
    if (!following) return writeLive(this.target.path, this.progress);
    const samples = following.follower.readNew(finished);
    const folded = foldSamples({ progress: this.progress, watch: following.watch }, samples);
    this.progress = folded.progress;
    following.watch = folded.watch;
    if (samples.length > 0 && !following.replaying) this.markOnce(following, 'replaying');
    if (folded.killSeen && !following.faultSeen) this.markOnce(following, 'fault_seen');
    writeLive(this.target.path, this.progress);
  }

  close(): void {
    clearInterval(this.timer);
    this.flush(true);
    this.following = null;
  }

  private markOnce(following: Following, stage: 'replaying' | 'fault_seen'): void {
    if (stage === 'replaying') following.replaying = true;
    else following.faultSeen = true;
    this.mark(stage, following.phase);
  }
}
