import type { LiveStage, LiveStageEntry } from '../api/live-run';

type StageRowFacts = { entry: LiveStageEntry; service: string };

export const STAGE_NAME: Record<LiveStage, string> = {
  starting_copy: 'Starting the sealed copy',
  copy_ready: 'Sealed copy ready',
  replaying: 'Replaying requests',
  restarting: 'Restarting the service',
  fault_seen: 'Fault seen',
  stopping_copy: 'Stopping the sealed copy',
  cleaned: 'Sealed copy removed',
  failed: 'Run failed',
};

const REPLAY_DETAIL_TEXT: Record<string, string> = {
  fault: 'Replaying requests with the fault on',
  fix: 'Replaying requests with the fix on',
};

export function describeStageRow({ entry, service }: StageRowFacts): string {
  if (entry.stage === 'restarting') return `Restarting ${service}`;
  const replayText = entry.stage === 'replaying' && entry.detail ? REPLAY_DETAIL_TEXT[entry.detail] : undefined;
  if (replayText) return replayText;
  const name = STAGE_NAME[entry.stage] ?? entry.stage;
  return entry.detail ? `${name}: ${entry.detail}` : name;
}

function isSameStage(first: LiveStageEntry, second: LiveStageEntry): boolean {
  return first.stage === second.stage && first.detail === second.detail;
}

export function collapseRepeatedStages(stages: LiveStageEntry[]): LiveStageEntry[] {
  return stages.filter((entry, index) => index === 0 || !isSameStage(stages[index - 1], entry));
}
