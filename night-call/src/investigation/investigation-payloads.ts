import { z } from 'zod';

import { payload, text } from './payload-parts';

export const INVESTIGATION_TRIGGERS = ['manual', 'alert'] as const;

export const investigationPayloads = {
  investigation_started: payload({ trigger: z.enum(INVESTIGATION_TRIGGERS) }),
  investigation_invoke_failed: payload({ reason: text }),
};
