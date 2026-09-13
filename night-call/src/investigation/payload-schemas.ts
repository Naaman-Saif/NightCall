import { BadRequestException } from '@nestjs/common';
import type { z } from 'zod';

import { analysisPayloads } from './analysis-payloads';
import { corePayloads } from './core-payloads';
import type { EventType, IncidentEvent } from './event-types';
import { investigationPayloads } from './investigation-payloads';
import { proofPayloads } from './proof-payloads';

export const payloadSchemas = { ...corePayloads, ...analysisPayloads, ...proofPayloads, ...investigationPayloads };

export type PayloadOf<Type extends EventType> = z.infer<(typeof payloadSchemas)[Type]>;

export function parsePayload(type: EventType, payload: unknown): Record<string, unknown> {
  const parsed = payloadSchemas[type].safeParse(payload);
  if (parsed.success) return parsed.data;
  throw new BadRequestException({ message: `invalid ${type} payload`, issues: parsed.error.issues });
}

export function payloadOf<Type extends EventType>(event: IncidentEvent, type: Type): PayloadOf<Type> {
  if (event.type !== type) throw new Error(`expected ${type}, got ${event.type}`);
  return event.payload as PayloadOf<Type>;
}
