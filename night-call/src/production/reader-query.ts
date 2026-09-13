import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

import { PRODUCTION_SERVICES } from '../recorder/series-services';

const minutes = z.coerce.number().int().min(1).max(30).default(10);

const traceIds = z
  .string()
  .max(20 * 33)
  .optional()
  .transform((value) => (value ? value.split(',') : []))
  .pipe(z.array(z.string().regex(/^[0-9a-f]{32}$/)).max(20));

export const serviceQueryShape = z.strictObject({ service: z.enum(PRODUCTION_SERVICES), minutes });

export const logsQueryShape = z.strictObject({
  service: z.enum(PRODUCTION_SERVICES),
  minutes,
  tail: z.coerce.number().int().min(1).max(200).default(100),
});

export const tracesQueryShape = z.strictObject({ service: z.enum(PRODUCTION_SERVICES), minutes, traceIds });

export const failureRateQueryShape = z.strictObject({ minutes });

export function parseQuery<Shape extends z.ZodType>(shape: Shape, query: unknown): z.infer<Shape> {
  const parsed = shape.safeParse(query);
  if (parsed.success) return parsed.data;
  throw new BadRequestException({ message: 'invalid reader query', issues: parsed.error.issues });
}
