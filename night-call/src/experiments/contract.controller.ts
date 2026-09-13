import { Controller, Inject, Post, Req, UseGuards } from '@nestjs/common';

import { EventWriter } from '../investigation/event-writer';
import { validIncidentId } from '../investigation/incident-paths';
import { appendAsService } from '../investigation/service-append';
import { requireRole } from '../tool-api/require-role';
import { RoleGuard, type ToolRequest } from '../tool-api/role.guard';
import { parseContractBody } from './contract-catalogue';

const CONTRACT_ID = 'contract-1';

@Controller('tool/incidents/:id')
@UseGuards(RoleGuard)
export class ContractController {
  constructor(@Inject(EventWriter) private readonly writer: EventWriter) {}

  @Post('contract')
  async record(@Req() request: ToolRequest) {
    requireRole(request, ['investigator']);
    const incidentId = validIncidentId(request.params.id);
    const checks = parseContractBody(request.body);
    const listed = checks.map((check) => `${check.name} ${check.comparator} ${check.value}`).join(', ');
    const summary = `Checks recorded before any experiment ran: ${listed}`;
    const draft = { actor: 'investigator' as const, type: 'contract_recorded' as const, summary, refs: [CONTRACT_ID], payload: { contractId: CONTRACT_ID, checks } };
    await appendAsService(this.writer, { incidentId, draft });
    return { contractId: CONTRACT_ID, checks };
  }
}
