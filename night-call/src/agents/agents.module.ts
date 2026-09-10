import { Module } from '@nestjs/common';

import { RemediatorService } from './remediator.service';
import { TriageService } from './triage.service';

@Module({
  providers: [TriageService, RemediatorService],
  exports: [TriageService, RemediatorService],
})
export class AgentsModule {}
