import { noteReading, type EvidenceLedger } from './evidence-ledger.js';
import type { CrashReading, FailureReading, ImpactReadings } from './impact-facts.js';
import type { IncidentApi, ReaderName, ReaderQuery, ReaderReply } from './incident-api.js';
import { logProgress } from './progress.js';
import { describeError } from './retry.js';

export const IMPACT_WINDOW_MINUTES = 10;

type SpanData = { spans?: { errorShare?: unknown; callsPerSecond?: unknown }[] };
type EventsData = { events?: { action?: unknown }[] };
type ImpactSession = { api: IncidentApi; ledger: EvidenceLedger };

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

export function failureReadingOf(reply: ReaderReply): FailureReading {
  const [service, frontend] = (reply.data as SpanData | undefined)?.spans ?? [];
  return {
    evidenceId: reply.evidence.evidenceId,
    errorShare: numberOrNull(service?.errorShare),
    frontendShare: numberOrNull(frontend?.errorShare),
    frontendCallsPerSecond: numberOrNull(frontend?.callsPerSecond),
    windowMinutes: IMPACT_WINDOW_MINUTES,
  };
}

export function crashReadingOf(reply: ReaderReply): CrashReading {
  const events = (reply.data as EventsData | undefined)?.events ?? [];
  const countOf = (action: string) => events.filter((event) => event.action === action).length;
  return { evidenceId: reply.evidence.evidenceId, outOfMemory: countOf('oom'), restarts: countOf('start'), windowMinutes: IMPACT_WINDOW_MINUTES };
}

async function readAndKeep(session: ImpactSession, request: { reader: ReaderName; query: ReaderQuery }): Promise<ReaderReply | null> {
  try {
    const reply = await session.api.read(request.reader, request.query);
    noteReading(session.ledger, { reader: request.reader, reply });
    return reply;
  } catch (error) {
    logProgress({ impactReadingFailed: request.reader, reason: describeError(error) });
    return null;
  }
}

export async function readImpact(session: ImpactSession, service: string): Promise<ImpactReadings> {
  const failure = await readAndKeep(session, { reader: 'failure-rate', query: { minutes: IMPACT_WINDOW_MINUTES } });
  const crashes = await readAndKeep(session, { reader: 'oom-events', query: { service, minutes: IMPACT_WINDOW_MINUTES } });
  const impact = { failure: failure && failureReadingOf(failure), crashes: crashes && crashReadingOf(crashes) };
  session.ledger.impact = impact;
  return impact;
}
