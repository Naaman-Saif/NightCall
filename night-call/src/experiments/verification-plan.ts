import { ConflictException } from '@nestjs/common';

import type { RunIds } from '../investigation/current-run';
import type { Snapshot } from '../investigation/snapshot';
import { acceptedReproduction } from './accepted-reproduction';
import type { ContractCheck } from './contract-catalogue';
import { RECOVERY_SPEED, recoveryRequestCount, roundRequestOf } from './round-request';
import { recipeSummaryOf, trafficPlanOf, type TrafficChoice } from './traffic-plan';
import type { RoundRequest } from './worker-messages';

export type VerificationPlan = {
  incidentId: string;
  runIds: RunIds;
  contract: ContractCheck[];
  speed: number;
  trafficSource: string;
  faultRound(cycle: number): RoundRequest;
  recoveryRound(cycle: number): RoundRequest;
};

export type PlanSource = { folder: string; runIds: RunIds };

function trafficChoiceOf(snapshot: Snapshot, folder: string): TrafficChoice {
  const reproduction = acceptedReproduction(snapshot);
  if (reproduction?.trafficSource === 'fixed_fallback') return 'fixed_fallback';
  return recipeSummaryOf(folder).present ? 'incident_traffic' : 'fixed_fallback';
}

export function verificationPlanOf(snapshot: Snapshot, source: PlanSource): VerificationPlan {
  const fault = acceptedReproduction(snapshot);
  const mitigation = snapshot.mitigation;
  if (!fault) throw new ConflictException({ code: 'no_accepted_reproduction' });
  if (!mitigation?.variant) throw new ConflictException({ code: 'mitigation_missing' });
  const contract = (snapshot.contract?.checks ?? []) as ContractCheck[];
  const speed = RECOVERY_SPEED;
  const recipe = trafficChoiceOf(snapshot, source.folder);
  const faultTraffic = trafficPlanOf(source.folder, { recipe, speed, requestCount: null });
  const recoveryTraffic = trafficPlanOf(source.folder, { recipe, speed, requestCount: recoveryRequestCount(contract) });
  const prefix = (cycle: number) => `${source.runIds.verificationRunId}-c${cycle}`;
  const faultChoice = { flagVariant: fault.recipe.flagVariant, restart: true, stopOnFailure: true, speed, traffic: faultTraffic };
  const recoveryChoice = { flagVariant: mitigation.variant, restart: mitigation.restart ?? true, stopOnFailure: false, speed, traffic: recoveryTraffic };
  const faultRound = (cycle: number) => roundRequestOf({ name: `${prefix(cycle)}-fault`, ...faultChoice });
  const recoveryRound = (cycle: number) => roundRequestOf({ name: `${prefix(cycle)}-mitigated`, ...recoveryChoice });
  return { incidentId: snapshot.incident.id, runIds: source.runIds, contract, speed, trafficSource: faultTraffic.source, faultRound, recoveryRound };
}
