import { SYMPTOM_CONTRACT } from './experiment-steps.js';
import { waitForJobEnd } from './job-wait.js';
import type { JobResult } from './proof-types.js';
import { reviewedDecision } from './review-guard.js';
import { verificationDecision } from './review-rules.js';
import { runStep, type RunContext } from './run-steps.js';

type VerificationRun = { runId: string; result: JobResult };

const REVIEW_BY_MINUTE = 24;

async function runVerification(context: RunContext, ids: { mitigationId: string; contractId: string }): Promise<VerificationRun> {
  const started = await context.proof.startVerification(ids);
  const until = Math.min(context.run.deadline, context.run.openedAt + REVIEW_BY_MINUTE * 60_000);
  return { runId: started.id, result: await waitForJobEnd(context, { jobId: started.jobId, poller: 'verifier', until }) };
}

function verificationEvidence(result: JobResult): string {
  return [`Job state: ${result.state}`, `Failure reason: ${result.failureReason ?? 'none'}`, 'The checks below are the ones the verification run reported.'].join('\n');
}

async function reviewRun(context: RunContext, review: { run: VerificationRun; cause: string }): Promise<void> {
  const { run } = review;
  const work = async () => {
    const request = { kind: 'verification' as const, cause: review.cause, contract: SYMPTOM_CONTRACT, checks: run.result.checks, verdict: run.result.verdict, evidence: verificationEvidence(run.result) };
    const decision = await reviewedDecision(context.reviewer, { ...request, code: verificationDecision(run.result) });
    await context.proof.reviewVerification({ id: run.runId, ...decision });
    return decision;
  };
  const decision = await runStep(context, { nowDoing: 'Reviewing the verification rounds', skipLabel: 'reviewing the verification', work });
  context.record.verification = { verificationRunId: run.runId, verdict: run.result.verdict, approved: decision?.accepted === true };
}

export async function verifyMitigation(context: RunContext, cause: string): Promise<void> {
  const { mitigationId, contractId } = context.record;
  if (!mitigationId || !contractId) return;
  const nowDoing = 'Verifying the mitigation over three rounds in a test copy';
  const run = await runStep(context, { nowDoing, skipLabel: 'verifying the mitigation', work: () => runVerification(context, { mitigationId, contractId }) });
  if (run !== null) await reviewRun(context, { run, cause });
}
