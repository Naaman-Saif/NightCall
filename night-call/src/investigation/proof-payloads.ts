import { z } from 'zod';

import { checkResult, name, payload, runIds, text, texts } from './payload-parts';

const cycle = z.number().int().min(1).max(3);

export const proofPayloads = {
  mitigation_proposed: payload({
    mitigationId: name,
    explanation: text,
    diff: text,
    caveats: texts,
    notFixed: text,
  }),
  verification_started: payload(runIds),
  cycle_started: payload({ ...runIds, cycle }),
  cycle_finished: payload({ ...runIds, cycle, passed: z.boolean(), checks: z.array(checkResult).max(20) }),
  verification_reviewed: payload({ ...runIds, approved: z.boolean(), reasons: texts }),
  publication_changed: payload({
    state: z.enum(['publishing', 'published', 'failed']),
    repository: name,
    baseBranch: name,
    number: z.number().int().nullable(),
    url: z.string().max(500).nullable(),
    diff: text.nullable(),
    failureReason: text.nullable(),
  }),
};
