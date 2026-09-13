import { postCauseBrief } from './answer-brief.js';
import { pendingAnswer } from './answer-steps.js';
import { findCauses, type CauseOutcome } from './causes.js';
import { askImpact, readEvidence } from './evidence-steps.js';
import type { Answer } from './incident-api.js';
import { causeReproduced, newProofRecord, outcomeSentence, proofSentences } from './proof-record.js';
import { proveAndDecide } from './proof-steps.js';
import { waitForPublication } from './publication-wait.js';
import { newRun, postStatus, runStep, type RunContext, type RunState } from './run-steps.js';
import { postStopped, type StopFacts } from './stop-report.js';
import { choiceSentence, type UrgencyDecision } from './urgency.js';

export type InvestigationParts = Omit<RunContext, 'run' | 'record'> & { run?: RunState };

type RunOutcome = CauseOutcome & { answer: Answer | null; decision: UrgencyDecision; asked: boolean };

async function investigationSteps(context: RunContext): Promise<RunOutcome> {
  const asked = await askImpact(context);
  const pending = pendingAnswer(context, asked);
  await readEvidence(context);
  const causes = await findCauses(context);
  const { answer, decision } = await proveAndDecide(context, { causes, pending });
  await waitForPublication(context);
  const facts = { answer, decision, ...causes, proof: context.record };
  await runStep(context, { nowDoing: 'Writing the report', skipLabel: 'writing the report', work: () => postCauseBrief(context, facts) });
  await postStatus(context, { status: 'finished', assignment: `${choiceSentence(decision)} ${outcomeSentence(context.record)}` });
  return { ...facts, asked };
}

function stopFacts(context: RunContext, outcome: RunOutcome | null): StopFacts {
  const reason = outcome === null ? 'error' : outcome.answer ? 'answer_recorded' : 'no_answer';
  const mostLikely = outcome?.mostLikely ?? null;
  const reproduced = mostLikely !== null && causeReproduced(context.record, mostLikely.hypothesisId);
  const causes = { causes: outcome?.causes.length ?? 0, mostLikely: mostLikely?.claim ?? null, mostLikelyReproduced: reproduced };
  const record = { skipped: context.run.skipped, fallbacks: context.run.fallbacks, proofLines: proofSentences(context.record) };
  return { ledger: context.ledger, reason, answer: outcome?.answer ?? null, asked: outcome?.asked ?? false, ...causes, ...record };
}

export async function investigate(parts: InvestigationParts): Promise<UrgencyDecision> {
  const context: RunContext = { ...parts, record: newProofRecord(), run: parts.run ?? newRun() };
  try {
    const outcome = await investigationSteps(context);
    await postStopped(context.api, stopFacts(context, outcome));
    return outcome.decision;
  } catch (error) {
    await postStopped(context.api, stopFacts(context, null));
    throw error;
  }
}
