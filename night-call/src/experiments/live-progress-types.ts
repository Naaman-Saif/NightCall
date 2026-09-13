export const LIVE_STAGES = ['starting_copy', 'copy_ready', 'replaying', 'restarting', 'fault_seen', 'stopping_copy', 'cleaned', 'failed'] as const;

export type LiveStage = (typeof LIVE_STAGES)[number];
export type LivePhase = 'fault' | 'fix';
export type StageMark = { stage: LiveStage; at: string; detail: string | null };
export type LiveRequest = { at: string; route: string; productId: string | null; status: number | null; ms: number | null };
export type OomKill = { at: string; atRequest: number | null };

export type LiveProgress = {
  stage: LiveStage;
  stageAt: string;
  stages: StageMark[];
  requestsSent: number;
  requestsPlanned: number;
  errors: number;
  speed: number;
  trafficSource: string | null;
  memoryMiB: { latest: number | null; limit: number | null };
  oomKills: OomKill[];
  lastRequests: LiveRequest[];
};

export const MAX_STAGES = 30;
export const MAX_LAST_REQUESTS = 12;
export const MAX_OOM_KILLS = 10;
