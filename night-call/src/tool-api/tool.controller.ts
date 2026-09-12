import { BadRequestException, Body, Controller, Get, Inject, Logger, Param, Post, UseGuards } from '@nestjs/common';

import { BearerGuard } from './bearer.guard';
import { eventBodyShape, incidentIdShape } from './event-body';
import type { EventLog } from './event-log';

export const EVENT_LOG = 'EVENT_LOG';

@Controller('tool')
@UseGuards(BearerGuard)
export class ToolController {
  private readonly log = new Logger('ToolApi');

  constructor(@Inject(EVENT_LOG) private readonly events: EventLog) {}

  @Get('ping')
  ping() {
    return { reachable: true, service: 'night-call', answeredAt: new Date().toISOString() };
  }

  @Post('incidents/:id/events')
  appendEvent(@Param('id') id: string, @Body() body: unknown) {
    const incidentId = incidentIdShape.safeParse(id);
    const eventBody = eventBodyShape.safeParse(body);
    if (!incidentId.success || !eventBody.success) throw new BadRequestException('invalid incident id or event');
    const event = this.events.append(incidentId.data, eventBody.data);
    this.log.log(`event ${event.type} sequence ${event.sequence} for ${event.incidentId}`);
    return event;
  }
}
