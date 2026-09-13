import { join } from 'node:path';

import type { EventWriter } from '../investigation/event-writer';
import { incidentFolder } from '../investigation/incident-paths';
import { appendAsService } from '../investigation/service-append';
import { readJsonLines } from '../recorder/series-files';
import { identitiesMatch, type ProductionIdentity } from '../sandbox-copy/production-identity';
import type { WorkloadSample } from '../sandbox-copy/stop-rules';
import { evaluateChecks, type Evaluation } from './evaluate-checks';
import { writeEvidence, writeExperimentSeries } from './experiment-evidence';
import { outcomeSummary, startSummary, type ExperimentPlan } from './experiment-plan';
import type { JobResult } from './job-registry';
import { observationsOf } from './round-observations';
import { traceExcerpt } from './trace-excerpt';
import type { RoundOutcome } from './worker-messages';

export type RoundRun = { before: ProductionIdentity; after: ProductionIdentity; outcome: RoundOutcome };
export type FinishRequest = { plan: ExperimentPlan; run: RoundRun };
export type FailureRequest = { plan: ExperimentPlan; reason: string };

const IDENTITY_CHANGED = 'production identity changed during the experiment';

function finishedDraft(plan: ExperimentPlan, finished: { evaluation: Evaluation; seriesRef: string | null; summary: string }) {
  const payload = { experimentId: plan.experimentId, verdict: finished.evaluation.verdict, checks: finished.evaluation.checks, seriesRef: finished.seriesRef };
  return { actor: 'system' as const, type: 'experiment_finished' as const, summary: finished.summary.slice(0, 2000), refs: [plan.experimentId], payload };
}

function evaluationOf(plan: ExperimentPlan, { run, samples }: { run: RoundRun; samples: WorkloadSample[] }): Evaluation {
  if (!identitiesMatch(run.before, run.after)) return { verdict: 'failed', checks: [] };
  const observations = observationsOf({ summary: run.outcome.summary, oomEventCount: run.outcome.oomEvents.length, samples });
  return evaluateChecks(plan.contract, { stage: plan.kind === 'reproduction' ? 'fault' : 'mitigated', observations });
}

async function endForChangedProduction(writer: EventWriter, plan: ExperimentPlan): Promise<void> {
  const draft = { actor: 'system' as const, type: 'investigation_finished' as const, summary: `Stopped: ${IDENTITY_CHANGED}`, refs: [plan.experimentId], payload: { reason: 'infrastructure_failure' } };
  await appendAsService(writer, { incidentId: plan.incidentId, draft });
}

export async function recordFinish(writer: EventWriter, request: FinishRequest): Promise<JobResult> {
  const { plan, run } = request;
  const folder = incidentFolder(writer.stateDir, plan.incidentId);
  const samples = readJsonLines<WorkloadSample>(join(run.outcome.runFolder, `${run.outcome.name}.jsonl`));
  const evaluation = evaluationOf(plan, { run, samples });
  const seriesRef = writeExperimentSeries(folder, { experimentId: plan.experimentId, samples });
  const summary = outcomeSummary(plan, { outcome: run.outcome, evaluation });
  const { count, firstFailureRequest } = run.outcome.summary;
  const trace = traceExcerpt({ runFolder: run.outcome.runFolder, stage: run.outcome.name });
  const base = { experimentId: plan.experimentId, summary, recipeSource: plan.trafficSource, oomEvents: run.outcome.oomEvents, seriesRef };
  writeEvidence(folder, { ...base, requestsSent: count, firstFailureAtRequest: firstFailureRequest, checks: evaluation.checks, traceExcerpt: trace });
  await appendAsService(writer, { incidentId: plan.incidentId, draft: finishedDraft(plan, { evaluation, seriesRef, summary }) });
  const preserved = evaluation.verdict !== 'failed';
  if (!preserved) await endForChangedProduction(writer, plan);
  return { experimentId: plan.experimentId, verificationRunId: null, ...evaluation, failureReason: preserved ? null : IDENTITY_CHANGED };
}

export async function recordFailure(writer: EventWriter, request: FailureRequest): Promise<JobResult> {
  const { plan, reason } = request;
  const evaluation: Evaluation = { verdict: 'failed', checks: [] };
  const summary = `${startSummary(plan)}. Failed: ${reason}`;
  const folder = incidentFolder(writer.stateDir, plan.incidentId);
  const base = { experimentId: plan.experimentId, summary, recipeSource: plan.trafficSource, oomEvents: [], seriesRef: null };
  writeEvidence(folder, { ...base, requestsSent: 0, firstFailureAtRequest: null, checks: [], traceExcerpt: null });
  const draft = finishedDraft(plan, { evaluation, seriesRef: null, summary });
  await appendAsService(writer, { incidentId: plan.incidentId, draft }).catch(() => undefined);
  return { experimentId: plan.experimentId, verificationRunId: null, ...evaluation, failureReason: reason.slice(0, 1000) };
}
