import { Injectable, Logger } from '@nestjs/common';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { settings } from '../config/settings';
import { sandboxTarget } from '../config/targets';
import type { FlagStates } from '../evidence/config-diff';
import { ProbesService } from '../probes/probes.service';
import { signatureIsGreen, type FailureSignature } from '../probes/reading';
import { joinCloneNetwork, leaveCloneNetwork } from './clone-network';
import { compose, sleep } from './compose';
import { readFlagdConfig, withFlagStates, writeFlagdConfig } from './flagd-file';

const greenTimeoutMs = 5 * 60 * 1000;
const pollMs = 15 * 1000;

function seedCloneFlagd(knownGood: FlagStates): void {
  const source = join(settings.astronomyShopPath, 'src/flagd/demo.flagd.json');
  const target = sandboxTarget().flagdConfigPath;
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target);
  writeFlagdConfig(target, withFlagStates(readFlagdConfig(target), knownGood));
}

@Injectable()
export class CloneService {
  private readonly log = new Logger(CloneService.name);

  constructor(private readonly probes: ProbesService) {}

  async up(knownGood: FlagStates): Promise<FailureSignature> {
    seedCloneFlagd(knownGood);
    await compose(settings.sandboxProject, ['up', '-d', '--pull', 'never', '--no-build']);
    await joinCloneNetwork();
    return this.waitForGreen();
  }

  async down(): Promise<void> {
    await leaveCloneNetwork();
    await compose(settings.sandboxProject, ['down', '--volumes', '--remove-orphans']);
  }

  private async waitForGreen(): Promise<FailureSignature> {
    const deadline = Date.now() + greenTimeoutMs;
    let signature = await this.probes.signature(sandboxTarget());
    while (!signatureIsGreen(signature) && Date.now() < deadline) {
      this.log.log(`clone not green yet: ${Object.keys(signature).join(', ')}`);
      await sleep(pollMs);
      signature = await this.probes.signature(sandboxTarget());
    }
    return signature;
  }
}
