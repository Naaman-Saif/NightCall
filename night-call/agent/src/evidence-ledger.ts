import type { ImpactReadings } from './impact-facts.js';
import type { ReaderName, ReaderReply } from './incident-api.js';

export type KnownFact = { text: string; evidenceIds: string[] };

export type Brief = { summary: string; knownFacts: KnownFact[]; unknowns: string[]; nextStep: string };

export type RecordedReading = { reader: ReaderName; summary: string; excerpt: string };

export type EvidenceLedger = {
  ids: Set<string>;
  summaries: Map<ReaderName, KnownFact>;
  readings: Map<string, RecordedReading>;
  hypotheses: string[];
  lastBrief: Brief | null;
  impact: ImpactReadings | null;
};

export function newLedger(): EvidenceLedger {
  return { ids: new Set(), summaries: new Map(), readings: new Map(), hypotheses: [], lastBrief: null, impact: null };
}

export function noteReading(ledger: EvidenceLedger, reading: { reader: ReaderName; reply: ReaderReply }): void {
  const { evidenceId, summary, excerpt } = reading.reply.evidence;
  if (!evidenceId) return;
  ledger.ids.add(evidenceId);
  ledger.readings.set(evidenceId, { reader: reading.reader, summary, excerpt });
  if (summary) ledger.summaries.set(reading.reader, { text: summary, evidenceIds: [evidenceId] });
}

export function readingText(ledger: EvidenceLedger, evidenceId: string): string {
  const reading = ledger.readings.get(evidenceId);
  return reading ? `${reading.summary}\n${reading.excerpt}` : '';
}

export function readingFacts(ledger: EvidenceLedger): KnownFact[] {
  return [...ledger.summaries.values()];
}

export function unknownEvidenceIds(ledger: EvidenceLedger, ids: string[]): string[] {
  return ids.filter((id) => !ledger.ids.has(id));
}

export function seedEvidenceIds(ledger: EvidenceLedger, snapshot: Record<string, unknown>): void {
  const evidence = snapshot.evidence;
  const ids = Array.isArray(evidence)
    ? evidence.map((item: { id?: string; evidenceId?: string }) => item.id ?? item.evidenceId ?? '')
    : Object.keys((evidence as object | undefined) ?? {});
  ids.filter((id) => id !== '').forEach((id) => ledger.ids.add(id));
}
