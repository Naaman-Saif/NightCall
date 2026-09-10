import { Injectable, Logger } from '@nestjs/common';

import type { FlagChange, FlagStates } from '../evidence/config-diff';
import { signatureIsGreen, type FailureSignature } from '../probes/reading';
import type { Candidate } from '../sandbox/actions';
import type { Reproduction } from '../sandbox/replay.service';
import { SandboxFacade } from '../sandbox/sandbox.facade';
import type { Trial } from '../sandbox/trial.service';

export interface SandboxRunInput {
  diff: FlagChange[];
  production: FailureSignature;
  candidates: Candidate[];
  knownGood: FlagStates;
}

export interface SandboxRunOutput {
  reproduction?: Reproduction;
  trials: Trial[];
}

function untried(candidate: Candidate, note: string): Trial {
  return { candidate, verdict: 'untried', before: {}, after: {}, note };
}

@Injectable()
export class SandboxRunService {
  private readonly log = new Logger(SandboxRunService.name);

  constructor(private readonly sandbox: SandboxFacade) {}

  async run(input: SandboxRunInput): Promise<SandboxRunOutput> {
    if (input.diff.length === 0) return { trials: input.candidates.map((c) => untried(c, 'no config diff to replay')) };
    try {
      const baseline = await this.sandbox.clone.up(input.knownGood);
      if (!signatureIsGreen(baseline)) return { trials: input.candidates.map((c) => untried(c, `clone never went green: ${Object.keys(baseline).join(', ')}`)) };
      const reproduction = await this.sandbox.replay.reproduce(input.diff, input.production);
      const trials = reproduction.reproduced ? await this.trialAll(input) : input.candidates.map((c) => untried(c, 'not reproduced'));
      return { reproduction, trials };
    } finally {
      await this.sandbox.clone.down().catch((error: unknown) => this.log.error(`clone teardown failed: ${String(error)}`));
    }
  }

  private async trialAll(input: SandboxRunInput): Promise<Trial[]> {
    const trials: Trial[] = [];
    for (const candidate of input.candidates) {
      const cleared = trials.some((t) => t.verdict === 'cleared');
      trials.push(cleared ? untried(candidate, 'an earlier candidate already cleared the signature') : await this.sandbox.trial.run(candidate, input.knownGood));
    }
    return trials;
  }
}
