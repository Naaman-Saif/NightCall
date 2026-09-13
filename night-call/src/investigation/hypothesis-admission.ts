import { BadRequestException } from '@nestjs/common';

import type { EventDraft } from './event-types';

export const CLAIM_LIMIT = 160;
export const CONFIRM_BY_LIMIT = 200;

function distinct(evidenceIds: unknown): string[] {
  return [...new Set(Array.isArray(evidenceIds) ? evidenceIds.map(String) : [])];
}

function requireShortText(draft: EventDraft): void {
  if (String(draft.payload.claim).length > CLAIM_LIMIT) throw new BadRequestException(`claim must be at most ${CLAIM_LIMIT} characters`);
  if (String(draft.payload.predicted).length <= CONFIRM_BY_LIMIT) return;
  throw new BadRequestException(`predicted must be at most ${CONFIRM_BY_LIMIT} characters`);
}

export function cleanedHypothesis(draft: EventDraft): EventDraft {
  if (draft.type !== 'hypothesis_proposed') return draft;
  requireShortText(draft);
  const supportingEvidenceIds = distinct(draft.payload.supportingEvidenceIds);
  const contradictingEvidenceIds = distinct(draft.payload.contradictingEvidenceIds);
  const both = supportingEvidenceIds.filter((evidenceId) => contradictingEvidenceIds.includes(evidenceId));
  if (both.length > 0) throw new BadRequestException(`evidence cannot both support and contradict a cause: ${both.join(', ')}`);
  return { ...draft, payload: { ...draft.payload, supportingEvidenceIds, contradictingEvidenceIds } };
}
