import { Controller, Get, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';

import { EventWriter } from '../investigation/event-writer';
import { incidentFolder, validIncidentId } from '../investigation/incident-paths';
import { requireSnapshot } from '../investigation/require-snapshot';
import { requireRole } from '../tool-api/require-role';
import { RoleGuard, type ToolRequest } from '../tool-api/role.guard';
import { readEvidence } from './experiment-evidence';
import { reviewExperiment } from './experiment-review';
import { startExperiment } from './experiment-start';
import { ProofTools } from './proof-tools';

@Controller('tool/incidents/:id/experiments')
@UseGuards(RoleGuard)
export class ExperimentsController {
  constructor(
    @Inject(EventWriter) private readonly writer: EventWriter,
    @Inject(ProofTools) private readonly tools: ProofTools,
  ) {}

  @Post()
  @HttpCode(202)
  start(@Req() request: ToolRequest) {
    requireRole(request, ['investigator']);
    const deps = { writer: this.writer, registry: this.tools.registry, owner: this.tools.owner };
    return startExperiment(deps, { incidentId: validIncidentId(request.params.id), body: request.body });
  }

  @Get(':experimentId/evidence')
  evidence(@Req() request: ToolRequest) {
    requireRole(request, ['investigator', 'verifier']);
    const incidentId = validIncidentId(request.params.id);
    requireSnapshot(this.writer.stateDir, incidentId);
    return readEvidence(incidentFolder(this.writer.stateDir, incidentId), request.params.experimentId);
  }

  @Post(':experimentId/review')
  review(@Req() request: ToolRequest) {
    requireRole(request, ['verifier']);
    const incidentId = validIncidentId(request.params.id);
    return reviewExperiment(this.writer, { incidentId, experimentId: request.params.experimentId, body: request.body });
  }
}
