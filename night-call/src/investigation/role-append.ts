import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { z } from 'zod';

import { roleMayWrite } from './allow-list';
import { EVENT_TYPES, type IncidentEvent, type Role } from './event-types';
import type { EventWriter } from './event-writer';
import { parsePayload } from './payload-schemas';
import { incidentIsActive } from './reduce-events';

export type RoleAppend = { role: Role; incidentId: string; body: unknown };

const toolBodyShape = z.object({
  type: z.enum(EVENT_TYPES),
  summary: z.string().min(1).max(2000),
  refs: z.array(z.string().max(200)).max(50).default([]),
  payload: z.record(z.string(), z.unknown()).default({}),
});

function parseToolBody(body: unknown): z.infer<typeof toolBodyShape> {
  const parsed = toolBodyShape.safeParse(body);
  if (parsed.success) return parsed.data;
  throw new BadRequestException({ message: 'invalid event', issues: parsed.error.issues });
}

export async function appendAsRole(writer: EventWriter, request: RoleAppend): Promise<IncidentEvent> {
  const body = parseToolBody(request.body);
  if (!roleMayWrite(request.role, body.type)) throw new ForbiddenException(`${request.role} may not write ${body.type}`);
  return writer.update(request.incidentId, (events) => {
    if (!incidentIsActive(events)) throw new ConflictException('incident is not active');
    return { ...body, actor: request.role, payload: parsePayload(body.type, body.payload) };
  });
}
