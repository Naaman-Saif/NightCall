import { Inject, Injectable } from '@nestjs/common';

import { JobRegistry } from './job-registry';
import { SandboxOwner } from './sandbox-owner';

@Injectable()
export class ProofTools {
  constructor(
    @Inject(JobRegistry) readonly registry: JobRegistry,
    @Inject(SandboxOwner) readonly owner: SandboxOwner,
  ) {}
}
