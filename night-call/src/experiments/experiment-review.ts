import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import type { EventWriter } from '../investigation/event-writer';
import { requireSnapshot } from '../investigation/require-snapshot';
import { appendAsRole } from '../investigation/role-append';

export type ReviewRequest = { incidentId: string; experimentId: string; body: unknown };

const reviewShape = z.object({
  accepted: z.boolean(),
  reasons: z.array(z.string().min(1).max(500)).min(1).max(10),
});

function parseReview(body: unknown): z.infer<typeof reviewShape> {
  const parsed = reviewShape.safeParse(body);
  if (parsed.success) return parsed.data;
  throw new BadRequestException({ code: 'bad_review', issues: parsed.error.issues });
}

export async function reviewExperiment(writer: EventWriter, request: ReviewRequest): Promise<{ eventId: string }> {
  const { accepted, reasons } = parseReview(request.body);
  const { incidentId, experimentId } = request;
  const experiment = requireSnapshot(writer.stateDir, incidentId).experiments.find((item) => item.id === experimentId);
  if (!experiment) throw new NotFoundException({ code: 'experiment_not_found', experimentId });
  if (!experiment.finishedAt) throw new ConflictException({ code: 'experiment_running', experimentId });
  const summary = `Experiment ${experimentId} ${accepted ? 'accepted' : 'rejected'} after review`;
  const body = { type: 'experiment_reviewed', summary, refs: [experimentId], payload: { experimentId, accepted, reasons } };
  const event = await appendAsRole(writer, { role: 'verifier', incidentId, body });
  return { eventId: event.id };
}
