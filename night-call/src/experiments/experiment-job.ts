import type { EventWriter } from '../investigation/event-writer';
import type { ProductionIdentity } from '../sandbox-copy/production-identity';
import { recordFailure, recordFinish, type RoundRun } from './experiment-finish';
import type { ExperimentPlan } from './experiment-plan';
import type { Job, JobResult } from './job-registry';
import { progressReporter } from './progress-reporter';
import type { SandboxOwner } from './sandbox-owner';
import type { RoundOutcome } from './worker-messages';

export type ExperimentDeps = { writer: EventWriter; owner: SandboxOwner };
export type ExperimentRun = { plan: ExperimentPlan; job: Job };

async function sandboxRound(deps: ExperimentDeps, request: ExperimentRun): Promise<RoundRun> {
  const { plan } = request;
  const worker = await deps.owner.workerFor(plan.incidentId);
  const progress = progressReporter(deps.writer, request);
  worker.listen(progress.report);
  const before = await worker.request<ProductionIdentity>({ command: 'identity' });
  await deps.owner.warmUp(plan.incidentId);
  const outcome = await worker.request<RoundOutcome>({ command: 'round', round: plan.round });
  const after = await worker.request<ProductionIdentity>({ command: 'identity' });
  await progress.flushed();
  return { before, after, outcome };
}

export async function runExperiment(deps: ExperimentDeps, request: ExperimentRun): Promise<JobResult> {
  const { plan } = request;
  try {
    const run = await sandboxRound(deps, request);
    return await recordFinish(deps.writer, { plan, run });
  } catch (error) {
    await deps.owner.release(plan.incidentId).catch(() => undefined);
    return recordFailure(deps.writer, { plan, reason: error instanceof Error ? error.message : String(error) });
  }
}
