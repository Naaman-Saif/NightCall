import { identitiesMatch, type ProductionIdentity } from '../sandbox-copy/production-identity';
import type { CheckOutcome } from './evaluate-checks';
import type { ExperimentDeps } from './experiment-job';
import type { Job } from './job-registry';
import { evaluateStage } from './stage-evaluation';
import type { VerificationPlan } from './verification-plan';
import type { RoundOutcome } from './worker-messages';
import type { WorkerProcess } from './worker-process';

export type CycleRun = { plan: VerificationPlan; job: Job; cycle: number };
export type CycleOutcome = { passed: boolean; checks: CheckOutcome[]; productionChanged: boolean; failureReason: string | null };
type PlayedCycle = { before: ProductionIdentity; after: ProductionIdentity; fault: RoundOutcome; recovery: RoundOutcome };

async function playCycle(worker: WorkerProcess, run: CycleRun): Promise<PlayedCycle> {
  const before = await worker.request<ProductionIdentity>({ command: 'identity' });
  const fault = await worker.request<RoundOutcome>({ command: 'round', round: run.plan.faultRound(run.cycle) });
  const recovery = await worker.request<RoundOutcome>({ command: 'round', round: run.plan.recoveryRound(run.cycle) });
  const after = await worker.request<ProductionIdentity>({ command: 'identity' });
  return { before, after, fault, recovery };
}

function outcomeOf(plan: VerificationPlan, played: PlayedCycle): CycleOutcome {
  if (!identitiesMatch(played.before, played.after)) {
    return { passed: false, checks: [], productionChanged: true, failureReason: 'production identity changed during the round' };
  }
  const fault = evaluateStage(plan.contract, { stage: 'fault', outcome: played.fault });
  const recovery = evaluateStage(plan.contract, { stage: 'mitigated', outcome: played.recovery });
  const passed = fault.verdict === 'matches' && recovery.verdict === 'matches';
  return { passed, checks: [...fault.checks, ...recovery.checks], productionChanged: false, failureReason: null };
}

export async function runCycle(deps: ExperimentDeps, run: CycleRun): Promise<CycleOutcome> {
  const worker = await deps.owner.workerFor(run.plan.incidentId);
  worker.listen((progress) => {
    run.job.progress = { requests: progress.requests, errors: progress.errors, peakMemoryBytes: progress.peakMemoryBytes, round: run.cycle };
  });
  run.job.progress = { requests: 0, errors: 0, peakMemoryBytes: 0, round: run.cycle };
  await deps.owner.freshStack(run.plan.incidentId);
  return outcomeOf(run.plan, await playCycle(worker, run));
}
