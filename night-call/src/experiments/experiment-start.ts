import { BadRequestException, ConflictException } from '@nestjs/common';
import { z } from 'zod';

import type { EventWriter } from '../investigation/event-writer';
import { incidentFolder } from '../investigation/incident-paths';
import { requireSnapshot } from '../investigation/require-snapshot';
import { appendAsService } from '../investigation/service-append';
import type { Snapshot } from '../investigation/snapshot';
import { MIN_MITIGATION_REQUESTS } from './capped-recipe';
import type { ContractCheck } from './contract-catalogue';
import { runExperiment } from './experiment-job';
import { startSummary, type ExperimentPlan } from './experiment-plan';
import { experimentEndsInTime, explorationMinutesLeft } from './exploration-clock';
import type { JobRegistry } from './job-registry';
import type { SandboxOwner } from './sandbox-owner';
import { estimatedMinutesOf, trafficPlanOf, type TrafficPlan } from './traffic-plan';

export type StartDeps = { writer: EventWriter; registry: JobRegistry; owner: SandboxOwner };
export type StartRequest = { incidentId: string; body: unknown };
type StartBody = z.infer<typeof startBodyShape>;

const startBodyShape = z.object({
  kind: z.enum(['reproduction', 'mitigation']),
  hypothesisId: z.string().min(1).max(200),
  purpose: z.string().min(1).max(2000),
  recipe: z.enum(['incident_traffic', 'fixed_fallback']),
  flagVariant: z.enum(['on', 'off']),
  restart: z.boolean(),
  speed: z.number().min(0.5).max(4).default(1),
});

function parseStartBody(body: unknown): StartBody {
  const parsed = startBodyShape.safeParse(body);
  if (parsed.success) return parsed.data;
  throw new BadRequestException({ code: 'bad_experiment', issues: parsed.error.issues });
}

function mitigationRequestCount(contract: ContractCheck[], kind: StartBody['kind']): number | null {
  if (kind === 'reproduction') return null;
  const healthy = contract.find((check) => check.name === 'mitigated.healthy_requests')?.value ?? 0;
  return Math.max(MIN_MITIGATION_REQUESTS, healthy);
}

function planOf(snapshot: Snapshot, { body, folder }: { body: StartBody; folder: string }): ExperimentPlan & { traffic: TrafficPlan } {
  const contract = (snapshot.contract?.checks ?? []) as ContractCheck[];
  const { flagVariant, restart, speed, kind } = body;
  const traffic = trafficPlanOf(folder, { recipe: body.recipe, speed, requestCount: mitigationRequestCount(contract, kind) });
  const experimentId = `exp-${snapshot.experiments.length + 1}`;
  const replay = { recipePath: traffic.recipePath, speed, replayCapMs: traffic.shape.capMs, requestCount: traffic.shape.requestCount };
  const round = { name: experimentId, flagVariant, restart, stopOnFailure: kind === 'reproduction', count: traffic.count, pacingMs: traffic.pacingMs, ...replay };
  return { incidentId: snapshot.incident.id, experimentId, kind, round, trafficSource: traffic.source, contract, traffic };
}

function startedDraft(plan: ExperimentPlan, body: StartBody & { contractId: string }) {
  const { flagVariant, restart, count, pacingMs, stopOnFailure, speed } = plan.round;
  const recipe = { flagVariant, restart, count, pacingMs, stopOnFailure, speed };
  const payload = { experimentId: plan.experimentId, kind: body.kind, hypothesisId: body.hypothesisId, contractId: body.contractId, purpose: body.purpose, recipe, trafficSource: plan.trafficSource };
  return { actor: 'investigator' as const, type: 'experiment_started' as const, summary: startSummary(plan), refs: [plan.experimentId, body.hypothesisId, body.contractId], payload };
}

async function recordStart(deps: StartDeps, request: { snapshot: Snapshot; body: StartBody }) {
  const { snapshot, body } = request;
  const plan = planOf(snapshot, { body, folder: incidentFolder(deps.writer.stateDir, snapshot.incident.id) });
  const estimatedMinutes = estimatedMinutesOf(plan.traffic, deps.owner.isWarmFor(plan.incidentId));
  const clock = { startedAt: snapshot.incident.startedAt, nowMs: Date.now() };
  if (!experimentEndsInTime(clock, estimatedMinutes)) throw new ConflictException({ code: 'past_exploration_cutoff', minutesLeft: explorationMinutesLeft(clock) });
  const draft = startedDraft(plan, { ...body, contractId: String(snapshot.contract?.id) });
  await appendAsService(deps.writer, { incidentId: plan.incidentId, draft });
  return { plan, estimatedMinutes };
}

export async function startExperiment(deps: StartDeps, request: StartRequest) {
  const body = parseStartBody(request.body);
  const snapshot = requireSnapshot(deps.writer.stateDir, request.incidentId);
  if (!snapshot.contract) throw new ConflictException({ code: 'contract_missing' });
  const job = deps.registry.open('experiment');
  try {
    const { plan, estimatedMinutes } = await recordStart(deps, { snapshot, body });
    void deps.registry.run(job, () => runExperiment(deps, { plan, job }));
    return { experimentId: plan.experimentId, jobId: job.jobId, recipeSource: plan.trafficSource, estimatedMinutes };
  } catch (error) {
    deps.registry.discard(job);
    throw error;
  }
}
