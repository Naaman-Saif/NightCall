import type { ContractCheck } from './contract-catalogue';

export type Verdict = 'matches' | 'differs' | 'inconclusive' | 'failed';
export type Stage = 'fault' | 'mitigated';
export type Observations = Record<string, number | null>;
export type CheckOutcome = { name: string; passed: boolean; observed: number | null };
export type Evaluation = { verdict: Verdict; checks: CheckOutcome[] };
export type EvaluationInput = { stage: Stage; observations: Observations };

function holds(check: ContractCheck, observed: number): boolean {
  if (check.comparator === 'gte') return observed >= check.value;
  if (check.comparator === 'lte') return observed <= check.value;
  return observed === check.value;
}

function outcomeOf(check: ContractCheck, observations: Observations): CheckOutcome {
  const observed = observations[check.name] ?? null;
  return { name: check.name, passed: observed !== null && holds(check, observed), observed };
}

function verdictOf(checks: CheckOutcome[]): Verdict {
  if (checks.length === 0) return 'inconclusive';
  if (checks.some((check) => check.observed !== null && !check.passed)) return 'differs';
  if (checks.some((check) => check.observed === null)) return 'inconclusive';
  return 'matches';
}

export function evaluateChecks(contract: ContractCheck[], input: EvaluationInput): Evaluation {
  const stageChecks = contract.filter((check) => check.name.startsWith(`${input.stage}.`));
  const checks = stageChecks.map((check) => outcomeOf(check, input.observations));
  return { verdict: verdictOf(checks), checks };
}
