import type { TrafficSource } from './contract';

export type LiveStage =
  | 'starting_copy' | 'copy_ready' | 'replaying' | 'restarting' | 'fault_seen' | 'stopping_copy' | 'cleaned' | 'failed';

export type LiveStageEntry = { stage: LiveStage; at: string; detail: string | null };
export type OomKill = { at: string; atRequest: number | null };
export type LiveRequest = { at: string; route: string; productId: string | null; status: number | null; ms: number | null };

export type LiveRun = {
  stage: LiveStage;
  stageAt: string;
  stages: LiveStageEntry[];
  requestsSent: number;
  requestsPlanned: number | null;
  errors: number;
  speed: number | null;
  trafficSource: TrafficSource | null;
  memoryMiB: { latest: number | null; limit: number | null };
  oomKills: OomKill[];
  lastRequests: LiveRequest[];
};

export function experimentLivePath(incidentId: string, experimentId: string): string {
  return `/api/incidents/${encodeURIComponent(incidentId)}/experiments/${encodeURIComponent(experimentId)}/live`;
}

export function cycleLivePath(incidentId: string, roundNumber: number): string {
  return `/api/incidents/${encodeURIComponent(incidentId)}/cycles/${roundNumber}/live`;
}
