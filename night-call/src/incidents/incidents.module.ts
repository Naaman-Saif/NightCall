import { Module } from '@nestjs/common';
import { join } from 'node:path';

import { settings } from '../config/settings';
import { IncidentStore } from './incident-store';
import { IncidentsController } from './incidents.controller';
import { INCIDENT_STORE, IncidentsService } from './incidents.service';

@Module({
  controllers: [IncidentsController],
  providers: [
    { provide: INCIDENT_STORE, useFactory: () => new IncidentStore(join(settings.stateDir, 'incidents.json')) },
    IncidentsService,
  ],
  exports: [IncidentsService],
})
export class IncidentsModule {}
