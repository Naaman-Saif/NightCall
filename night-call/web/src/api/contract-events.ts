export type Actor = 'system' | 'runner' | 'lead' | 'investigator' | 'verifier' | 'operator';
export type RoleName = 'lead' | 'investigator' | 'verifier';
export type RoleStatus = 'ready' | 'working' | 'waiting_for_evidence' | 'waiting_for_context' | 'reviewing' | 'finished';
export type EvidenceKind = 'logs' | 'traces' | 'memory' | 'cpu' | 'oom_events' | 'deploy_history' | 'sandbox';
export type HypothesisStatus = 'testing' | 'supported' | 'contradicted' | 'inconclusive' | 'superseded';
export type Verdict = 'matches' | 'differs' | 'inconclusive' | 'failed';
export type CompletionReason = 'completed' | 'insufficient_evidence' | 'infrastructure_failure' | 'interrupted';
export type KnownFact = { text: string; evidenceIds: string[] };
export type CheckResult = { name: string; passed: boolean; observed: number };
export type ContractCheck = { name: string; comparator: 'gte' | 'lte' | 'eq'; value: number; unit: string };
export type Recipe = { flagVariant: string; restart: boolean; count: number; pacingMs: number; stopOnFailure: boolean };
export type VerificationRunIds = { verificationRunId: string; mitigationId: string; contractId: string };

export type EventPayloads = {
  alert_received: {
    label: string; alertName: string; service: string; severity: string;
    startedAt: string; deadlineAt: string; labels: Record<string, string>;
  };
  brief_updated: { summary: string; knownFacts: KnownFact[]; unknowns: string[]; nextStep: string };
  evidence_recorded: {
    evidenceId: string; kind: EvidenceKind; source: string; summary: string; observedAt: string; excerpt: string;
  };
  hypothesis_proposed: {
    hypothesisId: string; claim: string; supportingEvidenceIds: string[];
    contradictingEvidenceIds: string[]; predicted: string;
  };
  hypothesis_status_changed: { hypothesisId: string; status: HypothesisStatus; reason: string };
  question_asked: {
    questionId: string; text: string; whyItMatters: string; meanwhile: string; blocks: 'none' | 'mitigation';
  };
  context_supplied: { questionId: string | null; text: string; idempotencyKey: string };
  contract_recorded: { contractId: string; checks: ContractCheck[] };
  experiment_started: {
    experimentId: string; kind: 'reproduction' | 'mitigation'; hypothesisId: string;
    contractId: string; purpose: string; recipe: Recipe;
  };
  experiment_progress: {
    experimentId: string; requests: number; errors: number; peakMemoryBytes: number; peakCpuPercent: number;
  };
  experiment_finished: { experimentId: string; verdict: Verdict; checks: CheckResult[]; seriesRef: string };
  experiment_reviewed: { experimentId: string; accepted: boolean; reasons: string[] };
  mitigation_proposed: { mitigationId: string; explanation: string; diff: string; caveats: string[]; notFixed: string };
  verification_started: VerificationRunIds;
  cycle_started: VerificationRunIds & { cycle: number };
  cycle_finished: VerificationRunIds & { cycle: number; passed: boolean; checks: CheckResult[] };
  verification_reviewed: VerificationRunIds & { approved: boolean; reasons: string[] };
  publication_changed: {
    state: 'publishing' | 'published' | 'failed'; repository: string; baseBranch: string;
    number: number | null; url: string | null; diff: string; failureReason: string | null;
  };
  role_status_changed: { role: RoleName; status: RoleStatus; assignment: string };
  budget_exhausted: { deadlineAt: string };
  investigation_finished: { reason: CompletionReason };
};

export type EventType = keyof EventPayloads;

export type IncidentEvent<T extends EventType = EventType> = {
  [K in T]: {
    id: string;
    incidentId: string;
    sequence: number;
    occurredAt: string;
    actor: Actor;
    type: K;
    summary: string;
    refs: string[];
    payload: EventPayloads[K] & { illustrative?: boolean };
  };
}[T];

export const EVENT_TYPES: EventType[] = [
  'alert_received', 'brief_updated', 'evidence_recorded', 'hypothesis_proposed', 'hypothesis_status_changed',
  'question_asked', 'context_supplied', 'contract_recorded', 'experiment_started', 'experiment_progress',
  'experiment_finished', 'experiment_reviewed', 'mitigation_proposed', 'verification_started', 'cycle_started',
  'cycle_finished', 'verification_reviewed', 'publication_changed', 'role_status_changed', 'budget_exhausted',
  'investigation_finished',
];
