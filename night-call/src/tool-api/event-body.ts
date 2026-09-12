import { z } from 'zod';

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
  'cycle_started',
  'cycle_finished',
  'verification_reviewed',
  'publication_changed',
  'role_status_changed',
  'budget_exhausted',
  'investigation_finished',
] as const;

export const incidentIdShape = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

export const eventBodyShape = z.object({
  actor: z.enum(['lead', 'investigator', 'verifier', 'runner', 'operator', 'system']),
  type: z.enum(EVENT_TYPES),
  summary: z.string().min(1).max(2000),
  refs: z.array(z.string().max(200)).max(50).default([]),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type EventBody = z.infer<typeof eventBodyShape>;
