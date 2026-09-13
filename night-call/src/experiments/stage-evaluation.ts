import { join } from 'node:path';

import { readJsonLines } from '../recorder/series-files';
import type { WorkloadSample } from '../sandbox-copy/stop-rules';
import type { ContractCheck } from './contract-catalogue';
import { evaluateChecks, type Evaluation, type Stage } from './evaluate-checks';
import { observationsOf } from './round-observations';
import type { RoundOutcome } from './worker-messages';

export type StageOutcome = { stage: Stage; outcome: RoundOutcome };

export function samplesOf(outcome: RoundOutcome): WorkloadSample[] {
  return readJsonLines<WorkloadSample>(join(outcome.runFolder, `${outcome.name}.jsonl`));
}

export function evaluateStage(contract: ContractCheck[], { stage, outcome }: StageOutcome): Evaluation {
  const observations = observationsOf({ summary: outcome.summary, oomEventCount: outcome.oomEvents.length, samples: samplesOf(outcome) });
  return evaluateChecks(contract, { stage, observations });
}
