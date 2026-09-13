import { ConflictException } from '@nestjs/common';

import type { IncidentEvent } from '../investigation/event-types';
import type { EventWriter } from '../investigation/event-writer';
import { readSnapshot } from '../investigation/incident-catalog';
import { validIncidentId } from '../investigation/incident-paths';
import { appendAsService } from '../investigation/service-append';
import { exactLink, type RecordedIds } from './exact-source';
import type { Reading } from './reading';
import type { SourceLink } from './source-links';

export type ReadingAnswer = { evidence: IncidentEvent; data: unknown };

export type ReaderCall = { incidentId: unknown; read: () => Promise<Reading> };

function linksFor(reading: Reading, ids: RecordedIds): SourceLink[] {
  const exact = reading.exactSource ? [exactLink(reading.exactSource, ids)] : [];
  return [...exact, ...(reading.sourceLinks ?? [])];
}

function evidencePayload(reading: Reading, incidentId: string) {
  const evidenceId = `ev-${reading.kind.replace(/_/g, '-')}-${Date.now().toString(36)}`;
  const observedAt = reading.observedAt ?? new Date().toISOString();
  const sourceLinks = linksFor(reading, { incidentId, evidenceId });
  const crashCounts = reading.crashCounts ? { crashCounts: reading.crashCounts } : {};
  const described = { kind: reading.kind, source: reading.source.slice(0, 200), summary: reading.summary.slice(0, 2000) };
  return { evidenceId, ...described, observedAt, excerpt: reading.excerpt, sourceLinks, ...crashCounts };
}

export async function recordReading(writer: EventWriter, request: { incidentId: string; reading: Reading }): Promise<ReadingAnswer> {
  const payload = evidencePayload(request.reading, request.incidentId);
  const draft = { actor: 'system' as const, type: 'evidence_recorded' as const, summary: payload.summary, refs: [payload.evidenceId], payload };
  const evidence = await appendAsService(writer, { incidentId: request.incidentId, draft });
  return { evidence, data: request.reading.data };
}

export async function answerReaderCall(writer: EventWriter, call: ReaderCall): Promise<ReadingAnswer> {
  const incidentId = validIncidentId(call.incidentId);
  const snapshot = readSnapshot(writer.stateDir, incidentId);
  if (snapshot?.incident.lifecycle !== 'active') throw new ConflictException('incident is not active');
  return recordReading(writer, { incidentId, reading: await call.read() });
}
