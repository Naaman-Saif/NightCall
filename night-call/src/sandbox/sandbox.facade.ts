import { Inject, Injectable } from '@nestjs/common';

import { CloneService } from './clone.service';
import { ReplayService } from './replay.service';
import { TrialService } from './trial.service';

@Injectable()
export class SandboxFacade {
  @Inject(CloneService) readonly clone!: CloneService;
  @Inject(ReplayService) readonly replay!: ReplayService;
  @Inject(TrialService) readonly trial!: TrialService;
}
