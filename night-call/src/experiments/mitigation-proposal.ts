import { BadRequestException, ConflictException } from '@nestjs/common';
import { z } from 'zod';

import type { EventWriter } from '../investigation/event-writer';
import { requireSnapshot } from '../investigation/require-snapshot';
import { appendAsService } from '../investigation/service-append';
import { acceptedReproduction } from './accepted-reproduction';
import { oneLineDiff, variantsIn } from './mitigation-diff';

export type ProposalRequest = { incidentId: string; body: unknown; flagText: string };

const proposalShape = z.object({
  variant: z.string().min(1).max(40),
  restart: z.boolean().default(true),
  explanation: z.string().min(1).max(2000),
  caveats: z.array(z.string().min(1).max(500)).max(10).default([]),
  notFixed: z.string().min(1).max(2000),
});

function parseProposal(body: unknown): z.infer<typeof proposalShape> {
  const parsed = proposalShape.safeParse(body);
  if (parsed.success) return parsed.data;
  throw new BadRequestException({ code: 'bad_mitigation', issues: parsed.error.issues });
}

export async function proposeMitigation(writer: EventWriter, request: ProposalRequest): Promise<{ mitigationId: string; diff: string }> {
  const { variant, restart, explanation, caveats, notFixed } = parseProposal(request.body);
  const snapshot = requireSnapshot(writer.stateDir, request.incidentId);
  const fault = acceptedReproduction(snapshot);
  if (!fault) throw new ConflictException({ code: 'no_accepted_reproduction' });
  if (!variantsIn(request.flagText).includes(variant)) throw new BadRequestException({ code: 'unknown_variant' });
  if (variant === fault.recipe.flagVariant) throw new BadRequestException({ code: 'same_as_fault' });
  const diff = oneLineDiff({ flagText: request.flagText, from: fault.recipe.flagVariant, to: variant });
  const mitigationId = `mit-${snapshot.supersededMitigations.length + (snapshot.mitigation ? 2 : 1)}`;
  const summary = `Mitigation ${mitigationId}: set recommendationCacheFailure to ${variant}${restart ? ' and restart recommendation' : ''}`;
  const payload = { mitigationId, explanation, diff, caveats, notFixed, variant, restart };
  const draft = { actor: 'investigator' as const, type: 'mitigation_proposed' as const, summary, refs: [mitigationId, fault.id], payload };
  await appendAsService(writer, { incidentId: request.incidentId, draft });
  return { mitigationId, diff };
}
