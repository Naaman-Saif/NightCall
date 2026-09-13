import type {
  CheckResult, CompletionReason, ContractCheck, EvidenceKind, HypothesisStatus, KnownFact,
  Recipe, RoleName, RoleStatus, SourceLink, Verdict,
} from './contract-events';

export type * from './contract-events';
export { EVENT_TYPES } from './contract-events';

export type Phase = 'briefing' | 'investigating' | 'reproducing' | 'mitigating' | 'verifying' | 'publishing' | 'handoff';
export type Attention = 'none' | 'context_requested' | 'blocked';
export type Reproduction = 'untested' | 'testing' | 'confirmed' | 'not_reproduced' | 'inconclusive';
export type Lifecycle = 'active' | 'finished';

export type Incident = {
  id: string; label: string; service: string; alertName: string; severity: string;
  startedAt: string; lastActivityAt: string; deadlineAt: string; illustrative: boolean;
  lifecycle: Lifecycle; phase: Phase; attention: Attention;
  completionReason: null | 'budget_exhausted' | CompletionReason;
};

export type Brief = { summary: string; knownFacts: KnownFact[]; unknowns: string[]; nextStep: string; updatedAt: string };
export type RoleState = { status: RoleStatus; assignment: string; updatedAt: string | null };
export type Answer = { text: string; suppliedAt: string };
export type Evidence = {
  kind: EvidenceKind; source: string; summary: string; observedAt: string; excerpt: string; sourceLinks?: SourceLink[];
};

export type Hypothesis = {
  id: string; claim: string; status: 'proposed' | HypothesisStatus; supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[]; predicted: string; reason: string | null;
};

export type Question = {
  id: string; text: string; whyItMatters: string; meanwhile: string; blocks: 'none' | 'mitigation';
  askedAt: string; answer: Answer | null;
};

export type SuppliedContext = { questionId: string | null; text: string; suppliedAt: string };

export type Experiment = {
  id: string; kind: 'reproduction' | 'mitigation'; hypothesisId: string; contractId: string; purpose: string;
  recipe: Recipe; startedAt: string; finishedAt: string | null; progress: ExperimentProgress | null;
  verdict: Verdict | null; checks: CheckResult[]; review: { accepted: boolean; reasons: string[] } | null;
  seriesRef: string | null; trafficSource?: 'captured' | 'fixed_load' | null;
};

export type ExperimentProgress = { requests: number; errors: number; peakMemoryBytes: number; peakCpuPercent: number };

export type Mitigation = {
  id: string; explanation: string; diff: string; caveats: string[]; notFixed: string;
  status: 'proposed' | 'testing' | 'verified' | 'failed';
};

export type Cycle = {
  number: number; state: 'pending' | 'running' | 'passed' | 'failed'; checks: CheckResult[]; verificationRunId: string;
};

export type Publication = {
  state: 'not_eligible' | 'publishing' | 'published' | 'failed'; repository: string | null; baseBranch: string | null;
  number: number | null; url: string | null; diff: string | null; failureReason: string | null;
};

export type InvestigationProgress = 'not_started' | 'running' | 'stopped' | 'stalled' | 'interrupted' | 'finished';

export type RunStatus = 'not_started' | 'running' | 'stopped' | 'stalled' | 'interrupted';
export type RunStep = { text: string; value: string | null; evidenceId: string | null; questionId?: string | null };
export type CauseStatus = 'proposed' | 'supported' | 'contradicted';
export type CauseLine = { text: string; evidenceId: string | null };
export type RunCause = {
  id: string; claim: string; status: CauseStatus; supporting: CauseLine[]; contradicting: CauseLine[]; confirmBy: string | null;
};
export type RunReport = {
  status: RunStatus; statusAt: string | null; note?: string | null; nowDoing: string | null;
  did: RunStep[]; found: string[]; causes?: RunCause[]; notDone: string[];
};

export type Snapshot = {
  incident: Incident;
  headline?: string | null;
  runReport?: RunReport | null;
  investigation?: InvestigationProgress;
  brief: Brief | null;
  roles: Record<RoleName, RoleState>;
  evidence: Record<string, Evidence>;
  hypotheses: Hypothesis[];
  questions: Question[];
  context: SuppliedContext[];
  contract: null | { id: string; checks: ContractCheck[] };
  experiments: Experiment[];
  reproduction: Reproduction;
  mitigation: Mitigation | null;
  supersededMitigations: { id: string; explanation: string; supersededAt: string }[];
  currentVerificationRun: null | { verificationRunId: string; mitigationId: string; contractId: string; startedAt: string };
  cycles: Cycle[];
  verification: null | { verificationRunId: string; approved: boolean; reasons: string[] };
  publication: Publication;
  lastSequence: number;
};

export type IncidentListItem = {
  id: string; label: string; service: string; alertName: string; startedAt: string;
  lifecycle: Lifecycle; attention: Attention; phase: Phase; reproduction: Reproduction;
  publication: Publication | Publication['state']; illustrative: boolean;
};
