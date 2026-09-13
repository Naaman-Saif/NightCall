import { BadRequestException, ConflictException } from '@nestjs/common';
import { z } from 'zod';

import { incidentFolder } from '../investigation/incident-paths';
import { requireSnapshot } from '../investigation/require-snapshot';
import { appendAsService } from '../investigation/service-append';
import type { StartDeps, StartRequest } from './experiment-start';
import { verificationStartsInTime } from './exploration-clock';
import { runVerification } from './verification-job';
import { verificationPlanOf } from './verification-plan';

const verificationBodyShape = z.object({ mitigationId: z.string().min(1).max(200), contractId: z.string().min(1).max(200) });

function parseVerificationBody(body: unknown): z.infer<typeof verificationBodyShape> {
  const parsed = verificationBodyShape.safeParse(body);
  if (parsed.success) return parsed.data;
  throw new BadRequestException({ code: 'bad_verification', issues: parsed.error.issues });
}

export async function startVerification(deps: StartDeps, request: StartRequest) {
  const ids = parseVerificationBody(request.body);
  const snapshot = requireSnapshot(deps.writer.stateDir, request.incidentId);
  if (snapshot.reproduction !== 'confirmed') throw new ConflictException({ code: 'no_accepted_reproduction' });
  if (!verificationStartsInTime({ startedAt: snapshot.incident.startedAt, nowMs: Date.now() })) throw new ConflictException({ code: 'past_verification_cutoff' });
  const job = deps.registry.open('verification');
  try {
    const runIds = { verificationRunId: `vr-${Date.now().toString(36)}`, ...ids };
    const plan = verificationPlanOf(snapshot, { folder: incidentFolder(deps.writer.stateDir, request.incidentId), runIds });
    const summary = `Verification ${runIds.verificationRunId} started: 3 fresh test copies, each with the fault then the fix, replayed at ${plan.speed}x speed`;
    const draft = { actor: 'verifier' as const, type: 'verification_started' as const, summary, refs: [runIds.verificationRunId, ids.mitigationId, ids.contractId], payload: runIds };
    await appendAsService(deps.writer, { incidentId: request.incidentId, draft });
    void deps.registry.run(job, () => runVerification(deps, { plan, job }));
    return { verificationRunId: runIds.verificationRunId, jobId: job.jobId };
  } catch (error) {
    deps.registry.discard(job);
    throw error;
  }
}
