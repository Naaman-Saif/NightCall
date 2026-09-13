import { checkCauses, independentReaders, mostLikelyCause, type Cause, type CheckedCause, type DroppedCause } from './cause-rules.js';
import type { KnownFact } from './evidence-ledger.js';
import { readingsBlock } from './lead-prompts.js';
import { logProgress, type ProgressEvent } from './progress.js';
import { NOT_REPRODUCED, READER_WORDS } from './report-lines.js';
import { describeError } from './retry.js';
import { runStep, stepSignal, type RunContext } from './run-steps.js';

export type CauseOutcome = { causes: CheckedCause[]; mostLikely: CheckedCause | null; findings: KnownFact[] };

const PROPOSE_CAP_MS = 4 * 60_000;
const NO_CAUSES: CauseOutcome = { causes: [], mostLikely: null, findings: [] };

function findingsOf(dropped: DroppedCause[]): KnownFact[] {
  return dropped.filter((cause) => cause.check === 'effect_not_cause').map((cause) => ({ text: cause.claim, evidenceIds: cause.supportingEvidenceIds }));
}

function proposedEvent(cause: CheckedCause): ProgressEvent {
  const { hypothesisId, claim, supportingEvidenceIds, contradictingEvidenceIds, confirmWith } = cause;
  const payload = { hypothesisId, claim, supportingEvidenceIds, contradictingEvidenceIds, predicted: confirmWith };
  const refs = [hypothesisId, ...supportingEvidenceIds, ...contradictingEvidenceIds].slice(0, 50);
  return { type: 'hypothesis_proposed', summary: claim.slice(0, 2000), refs, payload };
}

function supportedEvent(context: RunContext, cause: CheckedCause): ProgressEvent {
  const readers = independentReaders(cause, context.ledger).map((reader) => READER_WORDS[reader]).join(', ');
  const reason = `Supported by independent readings of ${readers}, and no reading contradicts it. ${NOT_REPRODUCED}`;
  const payload = { hypothesisId: cause.hypothesisId, status: 'supported', reason };
  return { type: 'hypothesis_status_changed', summary: reason, refs: [cause.hypothesisId, ...cause.supportingEvidenceIds].slice(0, 50), payload };
}

async function postEach(context: RunContext, causes: CheckedCause[]): Promise<CheckedCause[]> {
  const posted: CheckedCause[] = [];
  for (const cause of causes) {
    try {
      await context.api.postEvent(proposedEvent(cause));
      posted.push(cause);
    } catch (error) {
      logProgress({ causeRefused: cause.hypothesisId, reason: describeError(error) });
    }
  }
  return posted;
}

async function markSupported(context: RunContext, cause: CheckedCause | null): Promise<CheckedCause | null> {
  if (cause === null) return null;
  try {
    await context.api.postEvent(supportedEvent(context, cause));
    return cause;
  } catch (error) {
    logProgress({ supportedRefused: cause.hypothesisId, reason: describeError(error) });
    return null;
  }
}

async function postCauses(context: RunContext, proposed: Cause[]): Promise<CauseOutcome> {
  const { accepted, dropped, rephrased, droppedCitations } = checkCauses(proposed, context.ledger);
  dropped.forEach((cause) => logProgress({ causeDropped: cause.claim.slice(0, 200), failedCheck: cause.check, value: cause.value }));
  droppedCitations.forEach((item) => logProgress({ citationDropped: item.evidenceId, citedAs: item.citedAs, cause: item.claim.slice(0, 200), failedCheck: item.check, value: item.value }));
  rephrased.forEach((cause) => logProgress({ causeRephrased: cause.claim.slice(0, 200), removed: cause.removed }));
  const causes = await postEach(context, accepted);
  context.ledger.hypotheses.push(...causes.map((cause) => cause.hypothesisId));
  const mostLikely = await markSupported(context, mostLikelyCause(causes, context.ledger));
  return { causes, mostLikely, findings: findingsOf(dropped) };
}

export async function findCauses(context: RunContext): Promise<CauseOutcome> {
  const work = async () => {
    const onFallback = () => context.run.fallbacks.push('comparing possible causes');
    const request = { readings: readingsBlock(context.ledger), signal: stepSignal(context.run, PROPOSE_CAP_MS), onFallback };
    return postCauses(context, await context.lead.proposeCauses(request));
  };
  return (await runStep(context, { nowDoing: 'Comparing possible causes', skipLabel: 'comparing possible causes', work })) ?? NO_CAUSES;
}
