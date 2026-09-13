import { z } from 'zod';

export const runRequestShape = z.object({
  incidentId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  mode: z.enum(['hello', 'long', 'investigate']),
});

export type RunRequest = z.infer<typeof runRequestShape>;
