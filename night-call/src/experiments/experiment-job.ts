import type { EventWriter } from '../investigation/event-writer';
import { incidentFolder } from '../investigation/incident-paths';
import type { ProductionIdentity } from '../sandbox-copy/production-identity';
import { recordFailure, recordFinish, type RoundRun } from './experiment-finish';
import type { ExperimentPlan } from './experiment-plan';
import type { Job, JobResult } from './job-registry';
import { liveExperimentPath } from './live-files';
import { LiveTracker } from './live-tracker';
import { progressReporter } from './progress-reporter';
import type { SandboxOwner } from './sandbox-owner';
import type { RoundOutcome } from './worker-messages';

export type ExperimentDeps = { writer: EventWriter; owner: SandboxOwner };
export type ExperimentRun = { plan: ExperimentPlan; job: Job };
type LiveRun = ExperimentRun & { live: LiveTracker };

async function replayRound(deps: ExperimentDeps, run: LiveRun): Promise<RoundOutcome> {
  const { plan, live } = run;
  const worker = await deps.owner.workerFor(plan.incidentId);
  const phase = plan.kind === 'reproduction' ? 'fault' : 'fix';
  live.mark('starting_copy');
  const runFolder = await deps.owner.warmUp(plan.incidentId);
  live.mark('copy_ready');
  live.mark(plan.round.restart ? 'restarting' : 'replaying', phase);
  live.follow({ runFolder, name: plan.round.name, planned: plan.round.count, phase });
  const outcome = await worker.request<RoundOutcome>({ command: 'round', round: plan.round });
  live.roundDone(outcome);
  return outcome;
}

async function sandboxRound(deps: ExperimentDeps, run: LiveRun): Promise<RoundRun> {
  const { plan } = run;
  const worker = await deps.owner.workerFor(plan.incidentId);
  const progress = progressReporter(deps.writer, run);
  worker.listen(progress.report);
  const before = await worker.request<ProductionIdentity>({ command: 'identity' });
  const outcome = await replayRound(deps, run);
  const after = await worker.request<ProductionIdentity>({ command: 'identity' });
  await progress.flushed();
  return { before, after, outcome };
}

async function releaseAfterFailure(deps: ExperimentDeps, run: LiveRun): Promise<void> {
  run.live.mark('failed', 'worker_error');
  run.live.mark('stopping_copy');
  await deps.owner.release(run.plan.incidentId).catch(() => undefined);
  run.live.mark('cleaned');
}

export async function runExperiment(deps: ExperimentDeps, request: ExperimentRun): Promise<JobResult> {
  const { plan } = request;
  const path = liveExperimentPath(incidentFolder(deps.writer.stateDir, plan.incidentId), plan.experimentId);
  const live = new LiveTracker({ path, speed: plan.round.speed, trafficSource: plan.trafficSource });
  try {
    const run = await sandboxRound(deps, { ...request, live });
    return await recordFinish(deps.writer, { plan, run });
  } catch (error) {
    await releaseAfterFailure(deps, { ...request, live });
    return recordFailure(deps.writer, { plan, reason: error instanceof Error ? error.message : String(error) });
  } finally {
    live.close();
  }
}
