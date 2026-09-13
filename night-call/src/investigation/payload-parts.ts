import { z } from 'zod';

export function payload<Shape extends z.ZodRawShape>(shape: Shape) {
  return z.strictObject({ ...shape, illustrative: z.literal(true).optional() });
}

export const name = z.string().min(1).max(200);
export const text = z.string().max(20_000);
export const texts = z.array(text).max(50);
export const names = z.array(name).max(50);
export const moment = z.string().min(1).max(64);

export const checkResult = z.strictObject({
  name,
  passed: z.boolean(),
  observed: z.union([z.number(), z.string(), z.null()]),
});

export const runIds = {
  verificationRunId: name,
  mitigationId: name,
  contractId: name,
};
