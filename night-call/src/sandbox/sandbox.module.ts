import { Module } from '@nestjs/common';

import { ProbesModule } from '../probes/probes.module';
import { CloneService } from './clone.service';
import { ReplayService } from './replay.service';
import { SandboxFacade } from './sandbox.facade';
import { TrialService } from './trial.service';

@Module({
  imports: [ProbesModule],
  providers: [CloneService, ReplayService, TrialService, SandboxFacade],
  exports: [SandboxFacade],
})
export class SandboxModule {}
