import { ConflictException } from '@nestjs/common';

import type { IncidentEvent } from '../investigation/event-types';
import type { EventWriter } from '../investigation/event-writer';
import { readSnapshot } from '../investigation/incident-catalog';
import { validIncidentId } from '../investigation/incident-paths';
import { appendAsService } from '../investigation/service-append';
import type { Reading } from './reading';

export type ReadingAnswer = { evidence: IncidentEvent; data: unknown };

export type ReaderCall = { incidentId: unknown; read: () => Promise<Reading> };

export async function recordReading(writer: EventWriter, request: { incidentId: string; reading: Reading }): Promise<ReadingAnswer> {
  const { kind, source, summary, excerpt, data } = request.reading;
  const evidenceId = `ev-${kind.replace(/_/g, '-')}-${Date.now().toString(36)}`;
  const shortSummary = summary.slice(0, 2000);
  const observedAt = new Date().toISOString();
  const payload = { evidenceId, kind, source: source.slice(0, 200), summary: shortSummary, observedAt, excerpt };
  const draft = { actor: 'system' as const, type: 'evidence_recorded' as const, summary: shortSummary, refs: [evidenceId], payload };
  const evidence = await appendAsService(writer, { incidentId: request.incidentId, draft });
  return { evidence, data };
}

export async function answerReaderCall(writer: EventWriter, call: ReaderCall): Promise<ReadingAnswer> {
  const incidentId = validIncidentId(call.incidentId);
  const snapshot = readSnapshot(writer.stateDir, incidentId);
  if (snapshot?.incident.lifecycle !== 'active') throw new ConflictException('incident is not active');
  return recordReading(writer, { incidentId, reading: await call.read() });
}
