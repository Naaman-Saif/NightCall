import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { IncidentsModule } from '../incidents/incidents.module';
import { ProbesModule } from '../probes/probes.module';
import { ReportModule } from '../report/report.module';
import { SandboxModule } from '../sandbox/sandbox.module';
import { PipelineDeps } from './pipeline.deps';
import { PipelineService } from './pipeline.service';
import { SandboxRunService } from './sandbox-run.service';
import { SnapshotWatcherService } from './snapshot-watcher.service';
import { WorkerService } from './worker.service';

@Module({
  imports: [IncidentsModule, ProbesModule, SandboxModule, AgentsModule, ReportModule],
  providers: [PipelineDeps, PipelineService, SandboxRunService, SnapshotWatcherService, WorkerService],
})
export class PipelineModule {}
