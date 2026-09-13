import { z } from 'zod';

import { checkResult, name, names, payload, text, texts } from './payload-parts';

const recipe = z.strictObject({
  flagVariant: name,
  restart: z.boolean(),
  count: z.number().int().min(1).max(5000),
  pacingMs: z.number().int().min(0).max(2000),
  stopOnFailure: z.boolean(),
  speed: z.number().min(0.5).max(4).optional(),
});

export const TRAFFIC_SOURCES = ['traces', 'prometheus_rate_fallback', 'fixed_fallback'] as const;

const contractCheck = z.strictObject({
  name,
  comparator: z.enum(['gte', 'lte', 'eq']),
  value: z.number(),
  unit: name,
});

export const analysisPayloads = {
  hypothesis_proposed: payload({
    hypothesisId: name,
    claim: text,
    supportingEvidenceIds: names,
    contradictingEvidenceIds: names,
    predicted: text,
  }),
  hypothesis_status_changed: payload({
    hypothesisId: name,
    status: z.enum(['testing', 'supported', 'contradicted', 'inconclusive', 'superseded']),
    reason: text,
  }),
  contract_recorded: payload({ contractId: name, checks: z.array(contractCheck).max(20) }),
  experiment_started: payload({
    experimentId: name,
    kind: z.enum(['reproduction', 'mitigation']),
    hypothesisId: name,
    contractId: name,
    purpose: text,
    recipe,
    trafficSource: z.enum(TRAFFIC_SOURCES).optional(),
  }),
  experiment_progress: payload({
    experimentId: name,
    requests: z.number().int().min(0),
    errors: z.number().int().min(0),
    peakMemoryBytes: z.number().min(0),
    peakCpuPercent: z.number().min(0),
  }),
  experiment_finished: payload({
    experimentId: name,
    verdict: z.enum(['matches', 'differs', 'inconclusive', 'failed']),
    checks: z.array(checkResult).max(20),
    seriesRef: name.nullable(),
  }),
  experiment_reviewed: payload({ experimentId: name, accepted: z.boolean(), reasons: texts }),
};
