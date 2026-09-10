import { Injectable } from '@nestjs/common';

import { sandboxTarget } from '../config/targets';
import type { FlagChange } from '../evidence/config-diff';
import { ProbesService } from '../probes/probes.service';
import { signatureIsGreen, signaturesMatch, type FailureSignature } from '../probes/reading';
import { sleep } from './compose';
import { setFlagInFile } from './flagd-file';

const settleMs = 75 * 1000;

export interface Reproduction {
  baseline: FailureSignature;
  afterReplay: FailureSignature;
  production: FailureSignature;
  reproduced: boolean;
}

@Injectable()
export class ReplayService {
  constructor(private readonly probes: ProbesService) {}

  async reproduce(diff: FlagChange[], production: FailureSignature): Promise<Reproduction> {
    const target = sandboxTarget();
    const baseline = await this.probes.signature(target);
    for (const change of diff) setFlagInFile(target.flagdConfigPath, change);
    await sleep(settleMs);
    const afterReplay = await this.probes.signature(target);
    const reproduced = signatureIsGreen(baseline) && signaturesMatch(afterReplay, production);
    return { baseline, afterReplay, production, reproduced };
  }
}
