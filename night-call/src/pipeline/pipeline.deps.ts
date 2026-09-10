import { Inject, Injectable } from '@nestjs/common';

import { RemediatorService } from '../agents/remediator.service';
import { TriageService } from '../agents/triage.service';
import { ProbesService } from '../probes/probes.service';
import { ReporterService } from '../report/reporter.service';
import { SandboxRunService } from './sandbox-run.service';

@Injectable()
export class PipelineDeps {
  @Inject(ProbesService) readonly probes!: ProbesService;
  @Inject(TriageService) readonly triage!: TriageService;
  @Inject(RemediatorService) readonly remediator!: RemediatorService;
  @Inject(SandboxRunService) readonly sandbox!: SandboxRunService;
  @Inject(ReporterService) readonly reporter!: ReporterService;
}
