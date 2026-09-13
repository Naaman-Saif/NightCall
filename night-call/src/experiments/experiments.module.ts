import { Module } from '@nestjs/common';

import { RoleGuard } from '../tool-api/role.guard';
import { ContractController } from './contract.controller';
import { DeadlineWatch } from './deadline-watch';
import { ExperimentsController } from './experiments.controller';
import { JobRegistry } from './job-registry';
import { JobsController } from './jobs.controller';
import { ProofRoutesController } from './proof-routes.controller';
import { ProofTools } from './proof-tools';
import { SandboxOwner, WORKER_FACTORY } from './sandbox-owner';
import { spawnWorker } from './worker-process';

@Module({
  controllers: [ContractController, ExperimentsController, JobsController, ProofRoutesController],
  providers: [RoleGuard, JobRegistry, SandboxOwner, ProofTools, DeadlineWatch, { provide: WORKER_FACTORY, useValue: spawnWorker }],
  exports: [SandboxOwner],
})
export class ExperimentsModule {}
