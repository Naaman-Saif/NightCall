import type { Role } from './event-types';
import type { PayloadOf } from './payload-schemas';
import type {
  Contract,
  Cycle,
  Experiment,
  Mitigation,
  Publication,
  Reproduction,
  SupersededMitigation,
  Verification,
  VerificationRun,
} from './proof-snapshot';
import type { RunReport } from './run-report-types';

export type Lifecycle = 'active' | 'finished';
export type Attention = 'none' | 'context_requested' | 'blocked' | 'no_answer';
export type Phase = 'briefing' | 'investigating' | 'reproducing' | 'mitigating' | 'verifying' | 'publishing' | 'handoff';
export type CompletionReason = PayloadOf<'investigation_finished'>['reason'] | 'budget_exhausted';

export type IncidentFacts = {
  id: string;
  label: string;
  service: string;
  alertName: string;
  severity: string;
  startedAt: string;
  lastActivityAt: string;
  deadlineAt: string;
  illustrative: boolean;
  lifecycle: Lifecycle;
  phase: Phase;
  attention: Attention;
  completionReason: CompletionReason | null;
};

export type RoleState = { status: PayloadOf<'role_status_changed'>['status']; assignment: string; updatedAt: string | null };
export type Brief = Omit<PayloadOf<'brief_updated'>, 'illustrative'> & { updatedAt: string };
export type Answer = { text: string; suppliedAt: string };
export type Question = Omit<PayloadOf<'question_asked'>, 'questionId' | 'illustrative'> & {
  id: string;
  askedAt: string;
  answer: Answer | null;
  status: 'waiting' | 'answered' | 'no_answer';
};
export type ContextItem = { questionId: string | null; text: string; suppliedAt: string };
type EvidencePayload = PayloadOf<'evidence_recorded'>;
export type CrashCounts = NonNullable<EvidencePayload['crashCounts']>;
export type EvidenceItem = Omit<EvidencePayload, 'evidenceId' | 'illustrative' | 'sourceLinks' | 'crashCounts' | 'value'> & {
  sourceLinks: NonNullable<EvidencePayload['sourceLinks']>;
  crashCounts: CrashCounts | null;
};
export type InvestigationState = 'not_started' | 'running' | 'stopped' | 'stalled' | 'interrupted' | 'finished';
export type InvestigationStop = Omit<PayloadOf<'investigation_stopped'>, 'illustrative'> & { stoppedAt: string };
export type Hypothesis = Omit<PayloadOf<'hypothesis_proposed'>, 'hypothesisId' | 'illustrative' | 'contradictions'> & {
  id: string;
  contradictions: NonNullable<PayloadOf<'hypothesis_proposed'>['contradictions']>;
  status: PayloadOf<'hypothesis_status_changed'>['status'] | 'proposed' | 'reproduced' | 'verified';
  reason: string | null;
};

export type Snapshot = {
  snapshotVersion: number;
  incident: IncidentFacts;
  headline: string;
  investigation: InvestigationState;
  investigationStop: InvestigationStop | null;
  investigationChangedAt: string | null;
  lastAgentActivityAt: string | null;
  runReport: RunReport;
  brief: Brief | null;
  roles: Record<Role, RoleState>;
  evidence: Record<string, EvidenceItem>;
  hypotheses: Hypothesis[];
  questions: Question[];
  context: ContextItem[];
  contract: Contract | null;
  experiments: Experiment[];
  reproduction: Reproduction;
  mitigation: Mitigation | null;
  supersededMitigations: SupersededMitigation[];
  currentVerificationRun: VerificationRun | null;
  cycles: Cycle[];
  verification: Verification | null;
  publication: Publication;
  lastSequence: number;
};
