export const EVENT_TYPES = [
  'alert_received',
  'brief_updated',
  'evidence_recorded',
  'hypothesis_proposed',
  'hypothesis_status_changed',
  'question_asked',
  'context_supplied',
  'contract_recorded',
  'experiment_started',
  'experiment_progress',
  'experiment_finished',
  'experiment_reviewed',
  'mitigation_proposed',
  'verification_started',
  'cycle_started',
  'cycle_finished',
  'verification_reviewed',
  'publication_changed',
  'role_status_changed',
  'budget_exhausted',
  'investigation_finished',
] as const;

export const ROLES = ['lead', 'investigator', 'verifier'] as const;

export const ACTORS = [...ROLES, 'runner', 'operator', 'system'] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type Role = (typeof ROLES)[number];
export type Actor = (typeof ACTORS)[number];

export type EventDraft = {
  actor: Actor;
  type: EventType;
  summary: string;
  refs: string[];
  payload: Record<string, unknown>;
};

export type IncidentEvent = { id: string; incidentId: string; sequence: number; occurredAt: string } & EventDraft;
