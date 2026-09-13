import { incidentFolder } from '../investigation/incident-paths';
import { appendAsService } from '../investigation/service-append';
import { liveCyclePath } from './live-files';
import { LiveTracker } from './live-tracker';
import type { CheckOutcome, Verdict } from './evaluate-checks';
import type { ExperimentDeps } from './experiment-job';
import type { Job, JobResult } from './job-registry';
import { runCycle, type CycleOutcome } from './verification-cycle';
import type { VerificationPlan } from './verification-plan';

export type VerificationRun = { plan: VerificationPlan; job: Job };

const CYCLES = [1, 2, 3];

function resultOf(plan: VerificationPlan, ended: { verdict: Verdict; checks: CheckOutcome[]; failureReason: string | null }): JobResult {
  return { experimentId: null, verificationRunId: plan.runIds.verificationRunId, ...ended };
}

function append(deps: ExperimentDeps, request: { plan: VerificationPlan; type: 'cycle_started' | 'cycle_finished' | 'investigation_finished'; summary: string; payload: Record<string, unknown> }) {
  const { plan, type, summary, payload } = request;
  const draft = { actor: 'system' as const, type, summary, refs: [plan.runIds.verificationRunId], payload };
  return appendAsService(deps.writer, { incidentId: plan.incidentId, draft });
}

function cycleLive(deps: ExperimentDeps, run: VerificationRun & { cycle: number }): LiveTracker {
  const path = liveCyclePath(incidentFolder(deps.writer.stateDir, run.plan.incidentId), run.cycle);
  return new LiveTracker({ path, speed: run.plan.speed, trafficSource: run.plan.trafficSource });
}

async function closeCycleCopy(deps: ExperimentDeps, closing: { plan: VerificationPlan; live: LiveTracker; outcome: CycleOutcome }): Promise<void> {
  const { plan, live, outcome } = closing;
  if (outcome.failureReason) live.mark('failed', outcome.productionChanged ? 'production_changed' : 'worker_error');
  live.mark('stopping_copy');
  await deps.owner.stopStack(plan.incidentId).catch(() => undefined);
  live.mark('cleaned');
  live.close();
}

async function playAndRecord(deps: ExperimentDeps, run: VerificationRun & { cycle: number }): Promise<CycleOutcome> {
  const { plan, cycle } = run;
  const speed = plan.speed;
  await append(deps, { plan, type: 'cycle_started', summary: `Round ${cycle} of 3 started, replayed at ${speed}x speed`, payload: { ...plan.runIds, cycle, speed } });
  const failed = (error: unknown): CycleOutcome => ({ passed: false, checks: [], productionChanged: false, failureReason: String(error) });
  const live = cycleLive(deps, run);
  const outcome = await runCycle(deps, { ...run, live }).catch(failed);
  await closeCycleCopy(deps, { plan, live, outcome });
  const summary = `Round ${cycle} of 3 ${outcome.passed ? 'passed' : 'failed'}${outcome.failureReason ? `: ${outcome.failureReason}` : ''}`.slice(0, 2000);
  await append(deps, { plan, type: 'cycle_finished', summary, payload: { ...plan.runIds, cycle, speed, passed: outcome.passed, checks: outcome.checks } });
  return outcome;
}

async function playCycles(deps: ExperimentDeps, run: VerificationRun): Promise<JobResult> {
  let checks: CheckOutcome[] = [];
  for (const cycle of CYCLES) {
    const outcome = await playAndRecord(deps, { ...run, cycle });
    if (outcome.productionChanged) {
      const payload = { reason: 'infrastructure_failure' };
      await append(deps, { plan: run.plan, type: 'investigation_finished', summary: `Stopped: ${outcome.failureReason}`, payload });
    }
    if (!outcome.passed) return resultOf(run.plan, { verdict: outcome.failureReason ? 'failed' : 'differs', checks: outcome.checks, failureReason: outcome.failureReason });
    checks = outcome.checks;
  }
  return resultOf(run.plan, { verdict: 'matches', checks, failureReason: null });
}

export async function runVerification(deps: ExperimentDeps, run: VerificationRun): Promise<JobResult> {
  try {
    return await playCycles(deps, run);
  } catch (error) {
    return resultOf(run.plan, { verdict: 'failed', checks: [], failureReason: String(error).slice(0, 1000) });
  } finally {
    await deps.owner.release(run.plan.incidentId).catch(() => undefined);
  }
}
