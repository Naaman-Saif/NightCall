import { Controller, Get, Inject, Logger, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';

import { EventWriter } from '../investigation/event-writer';
import { validIncidentId } from '../investigation/incident-paths';
import { appendAsRole } from '../investigation/role-append';
import { RoleGuard, type ToolRequest } from './role.guard';

@Controller('tool')
@UseGuards(RoleGuard)
export class ToolController {
  private readonly log = new Logger('ToolApi');

  constructor(@Inject(EventWriter) private readonly writer: EventWriter) {}

  @Get('ping')
  ping() {
    return { reachable: true, service: 'night-call', answeredAt: new Date().toISOString() };
  }

  @Post('incidents/:id/events')
  async appendEvent(@Req() request: ToolRequest) {
    if (!request.toolRole) throw new UnauthorizedException();
    const incidentId = validIncidentId(request.params.id);
    const event = await appendAsRole(this.writer, { role: request.toolRole, incidentId, body: request.body });
    this.log.log(`event ${event.type} sequence ${event.sequence} for ${event.incidentId} by ${event.actor}`);
    return event;
  }
}
