import { Controller, Get, Inject, Param } from '@nestjs/common';

import { EventWriter } from '../investigation/event-writer';
import { validIncidentId } from '../investigation/incident-paths';
import { readIncidentMarkers } from './incident-markers';

@Controller(['api/incidents', 'op/api/incidents'])
export class MarkersController {
  constructor(@Inject(EventWriter) private readonly writer: EventWriter) {}

  @Get(':id/markers')
  markers(@Param('id') id: string) {
    return readIncidentMarkers(this.writer.stateDir, validIncidentId(id));
  }
}
