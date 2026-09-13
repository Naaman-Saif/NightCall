import { independentReaders, type CheckedCause } from './cause-rules.js';
import type { EvidenceLedger } from './evidence-ledger.js';
import type { IncidentApi } from './incident-api.js';
import { logProgress, type ProgressEvent } from './progress.js';
import { NOT_REPRODUCED, READER_WORDS } from './report-lines.js';
import { describeError } from './retry.js';
import { ToolAnswerError } from './tool-client.js';

export type Contradiction = { evidenceId: string; contradicts: string };
export type FieldSupport = { contradictions: boolean };

const FIELD_REFUSED_STATUSES = [400, 422];

export function contradictionsOf(cause: CheckedCause): Contradiction[] {
  return cause.contradictingEvidenceIds.flatMap((evidenceId) => {
    const contradicts = cause.contradicts?.[evidenceId];
    return contradicts ? [{ evidenceId, contradicts }] : [];
  });
}

export function proposedEvent(cause: CheckedCause, withContradictions: boolean): ProgressEvent {
  const { hypothesisId, claim, supportingEvidenceIds, contradictingEvidenceIds, confirmWith } = cause;
  const contradictions = withContradictions ? contradictionsOf(cause) : [];
  const extra = contradictions.length > 0 ? { contradictions } : {};
  const payload = { hypothesisId, claim, supportingEvidenceIds, contradictingEvidenceIds, predicted: confirmWith, ...extra };
  const refs = [hypothesisId, ...supportingEvidenceIds, ...contradictingEvidenceIds].slice(0, 50);
  return { type: 'hypothesis_proposed', summary: claim.slice(0, 2000), refs, payload };
}

function fieldRefused(error: unknown): boolean {
  return error instanceof ToolAnswerError && FIELD_REFUSED_STATUSES.includes(error.status);
}

export async function postProposed(api: IncidentApi, plan: { cause: CheckedCause; support: FieldSupport }): Promise<void> {
  const withField = plan.support.contradictions && contradictionsOf(plan.cause).length > 0;
  try {
    await api.postEvent(proposedEvent(plan.cause, withField));
  } catch (error) {
    if (!withField || !fieldRefused(error)) throw error;
    plan.support.contradictions = false;
    logProgress({ contradictionsFieldRefused: describeError(error) });
    await api.postEvent(proposedEvent(plan.cause, false));
  }
}

export function supportedEvent(ledger: EvidenceLedger, cause: CheckedCause): ProgressEvent {
  const readers = independentReaders(cause, ledger).map((reader) => READER_WORDS[reader]).join(', ');
  const reason = `Supported by independent readings of ${readers}, and no reading contradicts it. ${NOT_REPRODUCED}`;
  const payload = { hypothesisId: cause.hypothesisId, status: 'supported', reason };
  return { type: 'hypothesis_status_changed', summary: reason, refs: [cause.hypothesisId, ...cause.supportingEvidenceIds].slice(0, 50), payload };
}
