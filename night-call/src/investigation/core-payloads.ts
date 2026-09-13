import { z } from 'zod';

import { ROLES } from './event-types';
import { moment, name, names, payload, text, texts } from './payload-parts';

const count = z.number().int().min(0);

export const ROLE_STATUSES = ['ready', 'working', 'waiting_for_evidence', 'waiting_for_context', 'reviewing', 'finished'] as const;

export const corePayloads = {
  alert_received: payload({
    label: z.string().regex(/^INC-\d{3,}$/),
    alertName: name,
    service: name,
    severity: name,
    startedAt: moment,
    deadlineAt: moment,
    labels: z.record(z.string(), z.string()),
  }),
  brief_updated: payload({
    summary: text,
    knownFacts: z.array(z.strictObject({ text, evidenceIds: names })).max(50),
    unknowns: texts,
    nextStep: text,
  }),
  evidence_recorded: payload({
    evidenceId: name,
    kind: z.enum(['logs', 'traces', 'memory', 'cpu', 'oom_events', 'deploy_history', 'sandbox']),
    source: name,
    summary: text,
    observedAt: moment,
    excerpt: text,
    sourceLinks: z
      .array(z.strictObject({ label: name, url: z.string().max(4000).regex(/^(https?:\/\/|\/api\/incidents\/)/) }))
      .max(20)
      .optional(),
    crashCounts: z.strictObject({ oom: count, die: count, start: count, since: moment }).optional(),
  }),
  question_asked: payload({
    questionId: name,
    text,
    whyItMatters: text,
    meanwhile: text,
    blocks: z.enum(['none', 'mitigation']),
  }),
  context_supplied: payload({ questionId: name.nullable(), text, idempotencyKey: name }),
  role_status_changed: payload({ role: z.enum(ROLES), status: z.enum(ROLE_STATUSES), assignment: text }),
  budget_exhausted: payload({ deadlineAt: moment }),
  investigation_finished: payload({
    reason: z.enum(['completed', 'insufficient_evidence', 'infrastructure_failure', 'interrupted']),
  }),
};
