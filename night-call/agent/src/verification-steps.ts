import { waitForJobEnd } from './job-wait.js';
import type { JobResult } from './proof-types.js';
import { verificationDecision } from './review-rules.js';
import { runStep, type RunContext } from './run-steps.js';

type VerificationRun = { runId: string; result: JobResult };

const REVIEW_BY_MINUTE = 24;

async function runVerification(context: RunContext, ids: { mitigationId: string; contractId: string }): Promise<VerificationRun> {
  const started = await context.proof.startVerification(ids);
  const until = Math.min(context.run.deadline, context.run.openedAt + REVIEW_BY_MINUTE * 60_000);
  return { runId: started.id, result: await waitForJobEnd(context, { jobId: started.jobId, poller: 'verifier', until }) };
}

export async function verifyMitigation(context: RunContext): Promise<void> {
  const { mitigationId, contractId } = context.record;
  if (!mitigationId || !contractId) return;
  const nowDoing = 'Verifying the mitigation over three rounds in a test copy';
  const run = await runStep(context, { nowDoing, skipLabel: 'verifying the mitigation', work: () => runVerification(context, { mitigationId, contractId }) });
  if (run === null) return;
  const decision = verificationDecision(run.result);
  const work = () => context.proof.reviewVerification({ id: run.runId, ...decision });
  const posted = await runStep(context, { nowDoing: 'Reviewing the verification rounds', skipLabel: 'reviewing the verification', work });
  context.record.verification = { verificationRunId: run.runId, verdict: run.result.verdict, approved: decision.accepted && posted !== null };
}
