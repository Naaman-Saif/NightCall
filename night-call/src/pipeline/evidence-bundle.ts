import type { Hypothesis } from '../agents/hypothesis';
import type { FlagChange } from '../evidence/config-diff';
import type { Incident } from '../incidents/incident';
import type { Reproduction } from '../sandbox/replay.service';
import type { Trial } from '../sandbox/trial.service';

export interface EvidenceBundle {
  incident: Incident;
  diff: FlagChange[];
  hypothesis: Hypothesis;
  reproduction?: Reproduction;
  trials: Trial[];
}

export type Outcome = 'proven' | 'reproduced_unfixed' | 'not_reproduced' | 'no_baseline';

export function outcomeOf(bundle: EvidenceBundle): Outcome {
  if (!bundle.reproduction?.reproduced) return 'not_reproduced';
  return bundle.trials.some((trial) => trial.verdict === 'cleared') ? 'proven' : 'reproduced_unfixed';
}
