import { ConflictException, UnprocessableEntityException } from '@nestjs/common';

import type { EventDraft } from './event-types';
import type { Snapshot } from './snapshot';

const NEEDS_REPRODUCTION = new Set(['mitigation_proposed', 'verification_started']);

function threeCyclesPassed(snapshot: Snapshot): boolean {
  return [1, 2, 3].every((number) => snapshot.cycles.some((cycle) => cycle.number === number && cycle.state === 'passed'));
}

export function requireProofOrder(snapshot: Snapshot, draft: EventDraft): void {
  if (NEEDS_REPRODUCTION.has(draft.type) && snapshot.reproduction !== 'confirmed') {
    throw new ConflictException({ code: 'no_accepted_reproduction' });
  }
  if (draft.type === 'verification_reviewed' && draft.payload.approved === true && !threeCyclesPassed(snapshot)) {
    throw new UnprocessableEntityException({ code: 'not_three_passed' });
  }
}
