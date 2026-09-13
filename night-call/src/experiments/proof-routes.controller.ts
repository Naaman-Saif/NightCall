import { Controller, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { readFileSync } from 'node:fs';

import { settings } from '../config/settings';
import { EventWriter } from '../investigation/event-writer';
import { validIncidentId } from '../investigation/incident-paths';
import { requireRole } from '../tool-api/require-role';
import { RoleGuard, type ToolRequest } from '../tool-api/role.guard';
import { proposeMitigation } from './mitigation-proposal';
import { ProofTools } from './proof-tools';
import { startVerification } from './verification-start';
import { reviewVerification } from './verification-review';

@Controller('tool/incidents/:id')
@UseGuards(RoleGuard)
export class ProofRoutesController {
  constructor(
    @Inject(EventWriter) private readonly writer: EventWriter,
    @Inject(ProofTools) private readonly tools: ProofTools,
  ) {}

  @Post('mitigations')
  mitigate(@Req() request: ToolRequest) {
    requireRole(request, ['investigator']);
    const flagText = readFileSync(settings.flagdConfigPath, 'utf8');
    return proposeMitigation(this.writer, { incidentId: validIncidentId(request.params.id), body: request.body, flagText });
  }

  @Post('verifications')
  @HttpCode(202)
  verify(@Req() request: ToolRequest) {
    requireRole(request, ['verifier']);
    const deps = { writer: this.writer, registry: this.tools.registry, owner: this.tools.owner };
    return startVerification(deps, { incidentId: validIncidentId(request.params.id), body: request.body });
  }

  @Post('verifications/:runId/review')
  review(@Req() request: ToolRequest) {
    requireRole(request, ['verifier']);
    const incidentId = validIncidentId(request.params.id);
    return reviewVerification(this.writer, { incidentId, runId: request.params.runId, body: request.body });
  }
}
