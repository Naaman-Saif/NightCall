import type { ReaderName, ReaderReply } from './incident-api.js';

export type KnownFact = { text: string; evidenceIds: string[] };

export type Brief = { summary: string; knownFacts: KnownFact[]; unknowns: string[]; nextStep: string };

export type EvidenceLedger = {
  ids: Set<string>;
  readings: Map<ReaderName, unknown>;
  hypotheses: string[];
  lastBrief: Brief | null;
};

type SpanReading = { spans?: { errorShare?: number | null }[] };

export function newLedger(): EvidenceLedger {
  return { ids: new Set(), readings: new Map(), hypotheses: [], lastBrief: null };
}

export function noteReading(ledger: EvidenceLedger, reading: { reader: ReaderName; reply: ReaderReply }): void {
  if (reading.reply.evidence.evidenceId) ledger.ids.add(reading.reply.evidence.evidenceId);
  ledger.readings.set(reading.reader, reading.reply.data);
}

export function unknownEvidenceIds(ledger: EvidenceLedger, ids: string[]): string[] {
  return ids.filter((id) => !ledger.ids.has(id));
}

export function hasFailureRate(ledger: EvidenceLedger): boolean {
  return ledger.readings.has('failure-rate');
}

export function failureShareOf(ledger: EvidenceLedger): number | null {
  const reading = ledger.readings.get('failure-rate') as SpanReading | undefined;
  return reading?.spans?.[0]?.errorShare ?? null;
}

export function seedEvidenceIds(ledger: EvidenceLedger, snapshot: Record<string, unknown>): void {
  const evidence = snapshot.evidence;
  const ids = Array.isArray(evidence)
    ? evidence.map((item: { id?: string; evidenceId?: string }) => item.id ?? item.evidenceId ?? '')
    : Object.keys((evidence as object | undefined) ?? {});
  ids.filter((id) => id !== '').forEach((id) => ledger.ids.add(id));
}
