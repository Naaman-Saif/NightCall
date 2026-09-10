import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { productionTarget } from '../config/targets';
import { readFlagStates } from '../evidence/config-diff';
import { writeLastGreen } from '../evidence/last-green';
import { ProbesService } from '../probes/probes.service';
import { signatureIsGreen } from '../probes/reading';

@Injectable()
export class SnapshotWatcherService {
  private readonly log = new Logger(SnapshotWatcherService.name);

  constructor(private readonly probes: ProbesService) {}

  @Interval(30000)
  async tick(): Promise<void> {
    const target = productionTarget();
    const flagsBefore = JSON.stringify(readFlagStates(target.flagdConfigPath));
    const signature = await this.probes.signature(target);
    if (!signatureIsGreen(signature)) {
      this.log.debug(`production not green, snapshot skipped: ${JSON.stringify(signature)}`);
      return;
    }
    const flagsAfter = readFlagStates(target.flagdConfigPath);
    if (JSON.stringify(flagsAfter) !== flagsBefore) return;
    writeLastGreen(flagsAfter);
  }
}
