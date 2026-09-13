import { z } from 'zod';

import { payload, text } from './payload-parts';

export const INVESTIGATION_TRIGGERS = ['manual', 'alert'] as const;

export const STOP_REASONS = ['answer_recorded', 'no_answer', 'error'] as const;

export const investigationPayloads = {
  investigation_started: payload({ trigger: z.enum(INVESTIGATION_TRIGGERS) }),
  investigation_invoke_failed: payload({ reason: text }),
  investigation_stopped: payload({
    reason: z.enum(STOP_REASONS),
    nextStepsAvailable: z.literal(false),
    summary: z.string().min(1).max(2000),
  }),
};
