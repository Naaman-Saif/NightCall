import { BadRequestException } from '@nestjs/common';
import { join } from 'node:path';
import { z } from 'zod';

export const incidentIdShape = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

export function validIncidentId(id: unknown): string {
  const parsed = incidentIdShape.safeParse(id);
  if (parsed.success) return parsed.data;
  throw new BadRequestException('invalid incident id');
}

export function incidentsRoot(stateDir: string): string {
  return join(stateDir, 'incidents');
}

export function incidentFolder(stateDir: string, incidentId: string): string {
  return join(incidentsRoot(stateDir), incidentId);
}

export function eventsPath(folder: string): string {
  return join(folder, 'events.jsonl');
}

export function snapshotPath(folder: string): string {
  return join(folder, 'snapshot.json');
}
