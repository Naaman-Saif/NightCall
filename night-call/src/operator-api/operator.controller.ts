import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';

import { EventWriter } from '../investigation/event-writer';
import { validIncidentId } from '../investigation/incident-paths';
import { supplyContext } from '../investigation/operator-context';
import { requireSnapshot } from '../investigation/require-snapshot';
import { OperatorGuard } from './operator.guard';

@Controller('op/api/incidents')
export class OperatorController {
  constructor(@Inject(EventWriter) private readonly writer: EventWriter) {}

  @Get(':id')
  snapshot(@Param('id') id: string) {
    return requireSnapshot(this.writer.stateDir, validIncidentId(id));
  }

  @Post(':id/context')
  @UseGuards(OperatorGuard)
  supply(@Param('id') id: string, @Body() body: unknown) {
    return supplyContext(this.writer, { incidentId: validIncidentId(id), body });
  }
}
