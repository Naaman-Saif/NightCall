import { BadRequestException, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import type { EventDraft, IncidentEvent } from './event-types';
import type { EventWriter } from './event-writer';
import { parsePayload } from './payload-schemas';

export type ContextRequest = { incidentId: string; body: unknown };

const contextBodyShape = z.strictObject({
  questionId: z.string().min(1).max(200).nullable().default(null),
  text: z.string().min(1).max(4000),
  idempotencyKey: z.string().min(1).max(200),
});

type ContextBody = z.infer<typeof contextBodyShape>;

function parseContextBody(body: unknown): ContextBody {
  const parsed = contextBodyShape.safeParse(body);
  if (parsed.success) return parsed.data;
  throw new BadRequestException({ message: 'invalid context', issues: parsed.error.issues });
}

function earlierAnswer(events: IncidentEvent[], idempotencyKey: string): IncidentEvent | undefined {
  return events.find((event) => event.type === 'context_supplied' && event.payload.idempotencyKey === idempotencyKey);
}

function contextDraft(events: IncidentEvent[], body: ContextBody): EventDraft {
  if (events[0]?.type !== 'alert_received') throw new NotFoundException('incident not found');
  const summary = `Operator: ${body.text}`.slice(0, 2000);
  const refs = body.questionId ? [body.questionId] : [];
  return { actor: 'operator', type: 'context_supplied', summary, refs, payload: parsePayload('context_supplied', body) };
}

export async function supplyContext(writer: EventWriter, request: ContextRequest): Promise<IncidentEvent> {
  const body = parseContextBody(request.body);
  return writer.update(request.incidentId, (events) => earlierAnswer(events, body.idempotencyKey) ?? contextDraft(events, body));
}
