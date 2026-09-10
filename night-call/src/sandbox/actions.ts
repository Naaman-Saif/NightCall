import { settings } from '../config/settings';
import { sandboxTarget } from '../config/targets';
import { actionRunsWithoutAHuman } from '../config/vocabulary';
import type { FlagStates } from '../evidence/config-diff';
import { compose } from './compose';
import { setFlagInFile } from './flagd-file';

export interface Candidate {
  action: string;
  target: string;
  value?: string;
  rationale: string;
}

export function candidateNeedsAHuman(candidate: Candidate): boolean {
  return !actionRunsWithoutAHuman(candidate.action);
}

export async function applyInSandbox(candidate: Candidate, knownGood: FlagStates): Promise<void> {
  if (candidateNeedsAHuman(candidate)) throw new Error(`${candidate.action} is never applied without a human`);
  if (candidate.action === 'revert_flag') {
    const to = knownGood[candidate.target];
    if (to === undefined) throw new Error(`no healthy value recorded for ${candidate.target}`);
    setFlagInFile(sandboxTarget().flagdConfigPath, { flag: candidate.target, to });
    return;
  }
  await compose(settings.sandboxProject, ['restart', candidate.target]);
}
