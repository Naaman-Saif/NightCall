import { z } from 'zod';

export const hypothesisSchema = z.object({
  service: z.string().describe('the service most likely at fault'),
  cause: z.string().describe('one or two sentences on what changed and why it breaks the service'),
  confidence: z.enum(['low', 'medium', 'high']),
  evidence: z.array(z.string()).describe('short pointers: a log line, a span operation, a flag name'),
});

export type Hypothesis = z.infer<typeof hypothesisSchema>;
