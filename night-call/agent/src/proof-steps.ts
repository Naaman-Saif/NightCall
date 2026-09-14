import { answerAtDecision, classifyWithSkip, type PendingAnswer } from './answer-steps.js';
import type { CheckedCause } from './cause-rules.js';
import type { CauseOutcome } from './causes.js';
import { EXTRA_EXPERIMENT, recordContract, REPRODUCTION, testCause } from './experiment-steps.js';
import type { Answer } from './incident-api.js';
import { proposeMitigation } from './mitigation-steps.js';
import { acceptedReproductions } from './proof-record.js';
import { minutesElapsed, type RunContext } from './run-steps.js';
import { decideUrgency, type UrgencyDecision } from './urgency.js';
import { verifyMitigation } from './verification-steps.js';

export const EXPLORATION_CUTOFF_MINUTE = 12;
export const EXPERIMENT_ESTIMATE_MINUTES = 6;

type ProofPlan = { causes: CauseOutcome; pending: PendingAnswer };

function reproducedClaim(context: RunContext, causes: CheckedCause[]): string {
  const reproduced = acceptedReproductions(context.record)[0];
  return causes.find((cause) => cause.hypothesisId === reproduced?.hypothesisId)?.claim ?? 'No reproduced cause was recorded.';
}

async function reproduce(context: RunContext, cause: CheckedCause | null): Promise<void> {
  if (context.record.contractId === null) return;
  if (cause === null) {
    context.run.skipped.push(`${REPRODUCTION.skipLabel} (no possible cause to test)`);
    return;
  }
  await testCause(context, { cause, labels: REPRODUCTION });
}

async function extraExperiment(context: RunContext, cause: CheckedCause | undefined): Promise<void> {
  if (cause === undefined || context.record.contractId === null) return;
  if (minutesElapsed(context.run) + EXPERIMENT_ESTIMATE_MINUTES > EXPLORATION_CUTOFF_MINUTE) {
    context.run.skipped.push(`${EXTRA_EXPERIMENT.skipLabel} (not enough time before minute ${EXPLORATION_CUTOFF_MINUTE})`);
    return;
  }
  await testCause(context, { cause, labels: EXTRA_EXPERIMENT });
}

export async function proveAndDecide(context: RunContext, plan: ProofPlan): Promise<{ answer: Answer | null; decision: UrgencyDecision }> {
  await recordContract(context);
  const tested = plan.causes.mostLikely ?? plan.causes.causes[0] ?? null;
  await reproduce(context, tested);
  const answer = await answerAtDecision(context, plan.pending);
  const decision = await decideUrgency(answer, classifyWithSkip(context));
  if (decision.urgency === 'tolerable') await extraExperiment(context, plan.causes.causes.find((cause) => cause !== tested));
  if (context.record.contractId) await proposeMitigation(context, plan.causes.causes);
  await verifyMitigation(context, reproducedClaim(context, plan.causes.causes));
  return { answer, decision };
}
