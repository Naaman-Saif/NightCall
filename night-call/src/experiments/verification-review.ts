import { BadRequestException, ConflictException } from '@nestjs/common';
import { z } from 'zod';

import type { EventWriter } from '../investigation/event-writer';
import { requireSnapshot } from '../investigation/require-snapshot';
import { appendAsRole } from '../investigation/role-append';

export type RunReviewRequest = { incidentId: string; runId: string; body: unknown };

const runReviewShape = z.object({
  approved: z.boolean(),
  reasons: z.array(z.string().min(1).max(500)).min(1).max(10),
});

function parseRunReview(body: unknown): z.infer<typeof runReviewShape> {
  const parsed = runReviewShape.safeParse(body);
  if (parsed.success) return parsed.data;
  throw new BadRequestException({ code: 'bad_review', issues: parsed.error.issues });
}

export async function reviewVerification(writer: EventWriter, request: RunReviewRequest): Promise<{ eventId: string }> {
  const { approved, reasons } = parseRunReview(request.body);
  const run = requireSnapshot(writer.stateDir, request.incidentId).currentVerificationRun;
  if (run?.verificationRunId !== request.runId) throw new ConflictException({ code: 'run_not_current' });
  const { verificationRunId, mitigationId, contractId } = run;
  const summary = `Verification ${verificationRunId} ${approved ? 'approved' : 'rejected'} after review`;
  const payload = { verificationRunId, mitigationId, contractId, approved, reasons };
  const body = { type: 'verification_reviewed', summary, refs: [verificationRunId], payload };
  const event = await appendAsRole(writer, { role: 'verifier', incidentId: request.incidentId, body });
  return { eventId: event.id };
}
