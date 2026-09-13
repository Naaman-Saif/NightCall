import { noteReading, type EvidenceLedger } from './evidence-ledger.js';
import type { EvidenceView, IncidentApi, ReaderName, ReaderQuery } from './incident-api.js';
import { logProgress } from './progress.js';
import type { ToolBudget } from './tool-budget.js';
import { ToolAnswerError } from './tool-client.js';

export const REPLY_BYTE_LIMIT = 6_000;
const SUMMARY_CHARACTERS = 1_000;

export type LeadSession = { api: IncidentApi; ledger: EvidenceLedger };
export type ToolContext = { session: LeadSession; budget: ToolBudget };

function viewKeeping(evidence: EvidenceView, keep: number): string {
  const excerpt = keep > 0 ? evidence.excerpt.slice(-keep) : '';
  return JSON.stringify({ ...evidence, summary: evidence.summary.slice(0, SUMMARY_CHARACTERS), excerpt });
}

export function trimmedView(evidence: EvidenceView): string {
  let keep = evidence.excerpt.length;
  let reply = viewKeeping(evidence, keep);
  while (Buffer.byteLength(reply) > REPLY_BYTE_LIMIT && keep > 0) {
    keep -= Buffer.byteLength(reply) - REPLY_BYTE_LIMIT;
    reply = viewKeeping(evidence, keep);
  }
  return reply;
}

export function toolFailure(error: unknown): string {
  logProgress({ toolError: String(error).slice(0, 300) });
  const outcome = error instanceof ToolAnswerError ? `refused the call with status ${error.status}` : 'could not be reached';
  return `NightCall ${outcome}; check the input or continue with the evidence you have`;
}

export async function readAndNote(session: LeadSession, request: { reader: ReaderName; query: ReaderQuery }): Promise<string> {
  try {
    const reply = await session.api.read(request.reader, request.query);
    noteReading(session.ledger, { reader: request.reader, reply });
    return trimmedView(reply.evidence);
  } catch (error) {
    return toolFailure(error);
  }
}
