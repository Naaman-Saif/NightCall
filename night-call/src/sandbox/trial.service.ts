import { Injectable } from '@nestjs/common';

import { sandboxTarget } from '../config/targets';
import type { FlagStates } from '../evidence/config-diff';
import { ProbesService } from '../probes/probes.service';
import { signatureIsGreen, type FailureSignature } from '../probes/reading';
import { applyInSandbox, candidateNeedsAHuman, type Candidate } from './actions';
import { sleep } from './compose';

const firstLookMs = 20 * 1000;
const betweenLooksMs = 30 * 1000;
const maxLooks = 6;

export type Verdict = 'cleared' | 'unchanged' | 'regressed' | 'untried' | 'needs_human' | 'failed_to_apply';

export interface Trial {
  candidate: Candidate;
  verdict: Verdict;
  before: FailureSignature;
  after: FailureSignature;
  note: string;
}

function verdictFor(before: FailureSignature, after: FailureSignature): Verdict {
  if (signatureIsGreen(after)) return 'cleared';
  return Object.keys(after).length > Object.keys(before).length ? 'regressed' : 'unchanged';
}

function unrun(candidate: Candidate, verdict: Verdict): Omit<Trial, 'before' | 'after' | 'note'> {
  return { candidate, verdict };
}

@Injectable()
export class TrialService {
  constructor(private readonly probes: ProbesService) {}

  async run(candidate: Candidate, knownGood: FlagStates): Promise<Trial> {
    const before = await this.probes.signature(sandboxTarget());
    if (candidateNeedsAHuman(candidate)) return { ...unrun(candidate, 'needs_human'), before, after: before, note: 'novel value, written down and never run' };
    try {
      await applyInSandbox(candidate, knownGood);
    } catch (error) {
      return { ...unrun(candidate, 'failed_to_apply'), before, after: before, note: String(error) };
    }
    const { after, looks } = await this.watchUntilStable();
    return { candidate, verdict: verdictFor(before, after), before, after, note: `${looks} looks over ${Math.round((firstLookMs + (looks - 1) * betweenLooksMs) / 1000)}s` };
  }

  private async watchUntilStable(): Promise<{ after: FailureSignature; looks: number }> {
    await sleep(firstLookMs);
    let previous = await this.probes.signature(sandboxTarget());
    for (let looks = 2; looks <= maxLooks; looks += 1) {
      await sleep(betweenLooksMs);
      const current = await this.probes.signature(sandboxTarget());
      if (signatureIsGreen(previous) && signatureIsGreen(current)) return { after: current, looks };
      previous = current;
    }
    return { after: previous, looks: maxLooks };
  }
}
