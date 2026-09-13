import { MIN_MITIGATION_REQUESTS } from './capped-recipe';
import type { ContractCheck } from './contract-catalogue';
import type { TrafficPlan } from './traffic-plan';
import type { RoundRequest } from './worker-messages';

export type ExperimentKind = 'reproduction' | 'mitigation';
export type RoundChoice = { name: string; flagVariant: string; restart: boolean; stopOnFailure: boolean; speed: number; traffic: TrafficPlan };

export const REPRODUCTION_SPEED = 1;
export const RECOVERY_SPEED = 2;

export function speedFor(kind: ExperimentKind): number {
  return kind === 'reproduction' ? REPRODUCTION_SPEED : RECOVERY_SPEED;
}

export function recoveryRequestCount(contract: ContractCheck[]): number {
  const healthy = contract.find((check) => check.name === 'mitigated.healthy_requests')?.value ?? 0;
  return Math.max(MIN_MITIGATION_REQUESTS, healthy);
}

export function roundRequestOf(choice: RoundChoice): RoundRequest {
  const { name, flagVariant, restart, stopOnFailure, speed, traffic } = choice;
  const replay = { recipePath: traffic.recipePath, replayCapMs: traffic.shape.capMs, requestCount: traffic.shape.requestCount };
  return { name, flagVariant, restart, stopOnFailure, speed, count: traffic.count, pacingMs: traffic.pacingMs, ...replay };
}
