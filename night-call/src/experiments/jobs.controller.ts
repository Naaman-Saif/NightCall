import { Controller, Get, Inject, Req, Res, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { validIncidentId } from '../investigation/incident-paths';
import { parseQuery } from '../production/reader-query';
import { requireRole } from '../tool-api/require-role';
import { RoleGuard, type ToolRequest } from '../tool-api/role.guard';
import { JobRegistry } from './job-registry';

type JobRequest = ToolRequest & { query: unknown };
type ClosingResponse = { on(event: 'close', listener: () => void): unknown };

const jobQueryShape = z.strictObject({ waitSeconds: z.coerce.number().int().min(0).max(60).default(0) });

@Controller('tool/incidents/:id/jobs')
@UseGuards(RoleGuard)
export class JobsController {
  constructor(@Inject(JobRegistry) private readonly registry: JobRegistry) {}

  @Get(':jobId')
  async job(@Req() request: JobRequest, @Res({ passthrough: true }) response: ClosingResponse) {
    requireRole(request, ['investigator', 'verifier']);
    validIncidentId(request.params.id);
    const { waitSeconds } = parseQuery(jobQueryShape, request.query);
    const closed = new AbortController();
    response.on('close', () => closed.abort());
    const job = await this.registry.waitFor({ jobId: request.params.jobId, waitSeconds, stop: closed.signal });
    return { jobId: job.jobId, kind: job.kind, state: job.state, progress: job.progress, result: job.result };
  }
}
