import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common';

import { EventWriter } from '../investigation/event-writer';
import { validIncidentId } from '../investigation/incident-paths';
import { requireSnapshot } from '../investigation/require-snapshot';

@Controller('api/incidents')
export class EvidenceController {
  constructor(@Inject(EventWriter) private readonly writer: EventWriter) {}

  @Get(':id/evidence/:evidenceId')
  evidence(@Param('id') id: string, @Param('evidenceId') evidenceId: string) {
    const snapshot = requireSnapshot(this.writer.stateDir, validIncidentId(id));
    const item = Object.hasOwn(snapshot.evidence, evidenceId) ? snapshot.evidence[evidenceId] : undefined;
    if (!item) throw new NotFoundException(`evidence ${evidenceId} not found`);
    return { evidenceId, ...item };
  }
}
