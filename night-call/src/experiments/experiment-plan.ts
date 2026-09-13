import type { ContractCheck } from './contract-catalogue';
import type { Evaluation } from './evaluate-checks';
import type { TrafficSource } from './traffic-plan';
import type { RoundOutcome, RoundRequest } from './worker-messages';

export type ExperimentKind = 'reproduction' | 'mitigation';

export type ExperimentPlan = {
  incidentId: string;
  experimentId: string;
  kind: ExperimentKind;
  round: RoundRequest;
  trafficSource: TrafficSource;
  contract: ContractCheck[];
};

const SOURCE_WORDS: Record<TrafficSource, string> = {
  traces: "replayed from the incident's traced traffic",
  prometheus_rate_fallback: "replayed at the incident's measured request rate",
  fixed_fallback: 'at a fixed pace of 5 per second',
};

export function startSummary(plan: ExperimentPlan): string {
  const { flagVariant, restart, count, speed } = plan.round;
  const pace = plan.trafficSource === 'fixed_fallback' ? '' : ` at speed ${speed}`;
  return `Experiment ${plan.experimentId}: flag ${flagVariant}${restart ? ' after a restart' : ''}, up to ${count} requests ${SOURCE_WORDS[plan.trafficSource]}${pace}`;
}

export function outcomeSummary(plan: ExperimentPlan, finished: { outcome: RoundOutcome; evaluation: Evaluation }): string {
  const { summary, oomEvents } = finished.outcome;
  const first = summary.firstFailureRequest === null ? 'no failure' : `first failure at request ${summary.firstFailureRequest}`;
  const passed = finished.evaluation.checks.filter((check) => check.passed).length;
  const counts = `${summary.count} requests sent, ${summary.errors} failed, ${oomEvents.length} out-of-memory kills, ${first}`;
  return `${startSummary(plan)}. ${counts}. Verdict ${finished.evaluation.verdict}: ${passed} of ${finished.evaluation.checks.length} checks passed.`;
}
