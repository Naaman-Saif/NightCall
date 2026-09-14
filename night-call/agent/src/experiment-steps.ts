import type { CheckedCause } from './cause-rules.js';
import { waitForJobEnd, waitLimit } from './job-wait.js';
import { logProgress } from './progress.js';
import type { ExperimentRecord } from './proof-record.js';
import { refusalCode } from './proof-replies.js';
import type { ContractCheck, ExperimentRequest, ExperimentStarted } from './proof-types.js';
import { describeError } from './retry.js';
import { reviewedDecision } from './review-guard.js';
import { experimentDecision } from './review-rules.js';
import { runStep, type RunContext } from './run-steps.js';

export type ExperimentLabels = { nowDoing: string; skipLabel: string; capMinutes: number };

export const SYMPTOM_CONTRACT: ContractCheck[] = [
  { name: 'fault.oom_kills', comparator: 'gte', value: 1, unit: 'kills' },
  { name: 'fault.http_failures', comparator: 'gte', value: 1, unit: 'requests' },
  { name: 'mitigated.http_failures', comparator: 'eq', value: 0, unit: 'requests' },
  { name: 'mitigated.restarts', comparator: 'eq', value: 0, unit: 'restarts' },
  { name: 'mitigated.healthy_requests', comparator: 'gte', value: 200, unit: 'requests' },
  { name: 'mitigated.peak_memory_share', comparator: 'lte', value: 0.9, unit: 'share' },
];

export const REPRODUCTION: ExperimentLabels = { nowDoing: 'Reproducing the failure in a test copy with the incident traffic', skipLabel: 'reproducing the failure', capMinutes: 8 };
export const EXTRA_EXPERIMENT: ExperimentLabels = { nowDoing: 'Testing the next possible cause in a test copy', skipLabel: 'testing the next possible cause', capMinutes: 6 };

type ExperimentPlan = Omit<ExperimentRequest, 'recipe'>;

export async function recordContract(context: RunContext): Promise<void> {
  const work = () => context.proof.recordContract(SYMPTOM_CONTRACT);
  context.record.contractId = await runStep(context, { nowDoing: 'Recording what counts as the same failure', skipLabel: 'recording the symptom checks', work });
}

async function startExperiment(context: RunContext, plan: ExperimentPlan): Promise<ExperimentStarted> {
  try {
    return await context.proof.startExperiment({ ...plan, recipe: 'incident_traffic' });
  } catch (error) {
    if (refusalCode(error) !== 'recipe_missing') throw error;
    logProgress({ recipeMissing: describeError(error) });
    const started = await context.proof.startExperiment({ ...plan, recipe: 'fixed_fallback' });
    return { ...started, recipeSource: 'fixed_fallback' };
  }
}

async function markTesting(context: RunContext, cause: CheckedCause): Promise<void> {
  const payload = { hypothesisId: cause.hypothesisId, status: 'testing', reason: 'Being tested in a test copy.' };
  const event = { type: 'hypothesis_status_changed', summary: payload.reason, refs: [cause.hypothesisId], payload };
  await context.api.postEvent(event).catch((error: unknown) => logProgress({ testingStatusRefused: describeError(error) }));
}

async function experimentFor(context: RunContext, test: { cause: CheckedCause; capMinutes: number }): Promise<ExperimentRecord> {
  const cause = test.cause;
  const plan: ExperimentPlan = { kind: 'reproduction', hypothesisId: cause.hypothesisId, purpose: `Reproduce: ${cause.claim}`, flagVariant: 'on', restart: false, speed: 1 };
  const started = await startExperiment(context, plan);
  await markTesting(context, cause);
  const until = waitLimit(context.run, { capMinutes: test.capMinutes, estimatedMinutes: started.estimatedMinutes });
  const result = await waitForJobEnd(context, { jobId: started.jobId, poller: 'investigator', until });
  const outcome = { verdict: result.verdict, checks: result.checks, recipeSource: started.recipeSource, accepted: false, reviewReasons: [] };
  return { experimentId: started.id, hypothesisId: cause.hypothesisId, ...outcome };
}

async function evidenceFor(context: RunContext, experimentId: string): Promise<string> {
  try {
    return await context.proof.readExperimentEvidence(experimentId);
  } catch (error) {
    logProgress({ experimentEvidenceUnread: describeError(error) });
    return 'The experiment evidence could not be read.';
  }
}

async function reviewExperiment(context: RunContext, review: { record: ExperimentRecord; cause: CheckedCause }): Promise<void> {
  const { record } = review;
  const work = async () => {
    const evidence = await evidenceFor(context, record.experimentId);
    const request = { kind: 'reproduction' as const, cause: review.cause.claim, contract: SYMPTOM_CONTRACT, checks: record.checks, verdict: record.verdict, evidence };
    const decision = await reviewedDecision(context.reviewer, { ...request, code: experimentDecision(record) });
    await context.proof.reviewExperiment({ id: record.experimentId, ...decision });
    return decision;
  };
  const decision = await runStep(context, { nowDoing: 'Reviewing the experiment against the recorded checks', skipLabel: 'reviewing the experiment', work });
  record.accepted = decision?.accepted === true;
  record.reviewReasons = decision?.reasons ?? [];
}

export async function testCause(context: RunContext, plan: { cause: CheckedCause; labels: ExperimentLabels }): Promise<void> {
  const work = () => experimentFor(context, { cause: plan.cause, capMinutes: plan.labels.capMinutes });
  const record = await runStep(context, { nowDoing: plan.labels.nowDoing, skipLabel: plan.labels.skipLabel, work });
  if (record === null) return;
  context.record.experiments.push(record);
  await reviewExperiment(context, { record, cause: plan.cause });
}
