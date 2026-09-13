import { ConflictException, UnprocessableEntityException } from '@nestjs/common';

import type { EventDraft } from './event-types';
import type { Snapshot } from './snapshot';

function requireContractOrder(snapshot: Snapshot, draft: EventDraft): void {
  if (draft.type === 'contract_recorded' && snapshot.contract) {
    throw new ConflictException({ code: 'contract_exists', contractId: snapshot.contract.id });
  }
  if (draft.type === 'experiment_started' && !snapshot.contract) throw new ConflictException({ code: 'contract_missing' });
}

function everyCheckPassed(snapshot: Snapshot, experimentId: unknown): boolean {
  const experiment = snapshot.experiments.find((item) => item.id === experimentId);
  if (!experiment || experiment.verdict !== 'matches') return false;
  return experiment.checks.length > 0 && experiment.checks.every((check) => check.passed);
}

function requireAcceptablePass(snapshot: Snapshot, draft: EventDraft): void {
  if (draft.type !== 'experiment_reviewed' || draft.payload.accepted !== true) return;
  if (everyCheckPassed(snapshot, draft.payload.experimentId)) return;
  throw new UnprocessableEntityException({ code: 'failed_check_accepted' });
}

export function requireExperimentRules(snapshot: Snapshot, draft: EventDraft): void {
  requireContractOrder(snapshot, draft);
  requireAcceptablePass(snapshot, draft);
}
