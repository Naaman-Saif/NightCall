import type { PayloadOf } from './payload-schemas';
import type { Role } from './event-types';

export type Lifecycle = 'active' | 'finished';
export type Attention = 'none' | 'context_requested' | 'blocked';
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
  phase: string;
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
};
export type ContextItem = { questionId: string | null; text: string; suppliedAt: string };
export type EvidenceItem = Omit<PayloadOf<'evidence_recorded'>, 'evidenceId' | 'illustrative'>;
export type Hypothesis = Omit<PayloadOf<'hypothesis_proposed'>, 'hypothesisId' | 'illustrative'> & {
  id: string;
  status: PayloadOf<'hypothesis_status_changed'>['status'] | 'proposed';
  reason: string | null;
};

export type Snapshot = {
  incident: IncidentFacts;
  brief: Brief | null;
  roles: Record<Role, RoleState>;
  evidence: Record<string, EvidenceItem>;
  hypotheses: Hypothesis[];
  questions: Question[];
  context: ContextItem[];
  contract: Record<string, unknown> | null;
  experiments: Record<string, unknown>[];
  reproduction: 'untested' | 'testing' | 'confirmed' | 'not_reproduced' | 'inconclusive';
  mitigation: Record<string, unknown> | null;
  supersededMitigations: Record<string, unknown>[];
  currentVerificationRun: Record<string, unknown> | null;
  cycles: Record<string, unknown>[];
  verification: Record<string, unknown> | null;
  publication: Record<string, unknown> & { state: 'not_eligible' | 'publishing' | 'published' | 'failed' };
  lastSequence: number;
};
