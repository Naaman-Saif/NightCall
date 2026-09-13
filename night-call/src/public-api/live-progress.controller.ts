import { Controller, Get, Header, Inject, Param } from '@nestjs/common';

import { liveCyclePath, liveExperimentPath, readLive } from '../experiments/live-files';
import { EventWriter } from '../investigation/event-writer';
import { incidentFolder, validIncidentId } from '../investigation/incident-paths';
import { requireSnapshot } from '../investigation/require-snapshot';

@Controller('api/incidents/:id')
export class LiveProgressController {
  constructor(@Inject(EventWriter) private readonly writer: EventWriter) {}

  @Get('experiments/:experimentId/live')
  @Header('Cache-Control', 'no-store')
  experiment(@Param('id') id: string, @Param('experimentId') experimentId: string) {
    return readLive(liveExperimentPath(this.folderOf(id), experimentId));
  }

  @Get('cycles/:number/live')
  @Header('Cache-Control', 'no-store')
  cycle(@Param('id') id: string, @Param('number') number: string) {
    return readLive(liveCyclePath(this.folderOf(id), Number(number)));
  }

  private folderOf(id: string): string {
    const incidentId = validIncidentId(id);
    requireSnapshot(this.writer.stateDir, incidentId);
    return incidentFolder(this.writer.stateDir, incidentId);
  }
}
