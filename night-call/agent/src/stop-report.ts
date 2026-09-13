import type { EvidenceLedger } from './evidence-ledger.js';
import { precisePercent, requireMeasured, type CrashReading, type FailureReading, type ImpactReadings } from './impact-facts.js';
import type { Answer, IncidentApi, ReaderName } from './incident-api.js';
import { logProgress, type ProgressEvent } from './progress.js';
import { describeError } from './retry.js';

export type StopReason = 'answer_recorded' | 'no_answer' | 'error';
export type StopFacts = { ledger: EvidenceLedger; answer: Answer | null; reason: StopReason };

export const CAUSE_NOT_BUILT = 'Did not look for the cause: that step is not built yet.';

const IMPACT_READERS: ReaderName[] = ['failure-rate', 'oom-events'];
const READER_WORDS: Record<ReaderName, string> = {
  'failure-rate': 'failure rate', memory: 'memory', cpu: 'CPU', 'oom-events': 'crashes', logs: 'logs', traces: 'traces', 'deploy-history': 'deploy history',
};

function failurePart(reading: FailureReading | null): string {
  if (reading === null) return 'could not be read';
  if (reading.errorShare === null) return 'not measured';
  return `${precisePercent(reading.errorShare)} over ${reading.windowMinutes} min`;
}

function crashPart(reading: CrashReading | null): string {
  if (reading === null) return 'could not be read';
  const window = `in ${reading.windowMinutes} min`;
  if (reading.outOfMemory === reading.restarts) return `${reading.outOfMemory} out-of-memory restarts ${window}`;
  return `${reading.outOfMemory} out-of-memory events and ${reading.restarts} restarts ${window}`;
}

export function readingsSentence(impact: ImpactReadings | null): string {
  const text = `Read failure rate (${failurePart(impact?.failure ?? null)}) and crashes (${crashPart(impact?.crashes ?? null)}).`;
  try {
    return impact ? requireMeasured(text, impact) : text;
  } catch (error) {
    logProgress({ readingsSentenceRefused: describeError(error) });
    return 'Read failure rate and crashes.';
  }
}

function otherReadingsSentence(ledger: EvidenceLedger): string {
  const others = [...ledger.summaries.keys()].filter((reader) => !IMPACT_READERS.includes(reader)).map((reader) => READER_WORDS[reader]);
  return others.length > 0 ? `Also read ${others.join(', ')}.` : '';
}

function answerSentence(facts: StopFacts): string {
  if (facts.reason === 'error') return 'Stopped after an error.';
  if (facts.answer === null) return 'Asked about customer impact; no answer arrived in time.';
  return `Asked about customer impact; answer: ${facts.answer.text.trim().replace(/[.!?]+$/, '').slice(0, 300)}.`;
}

export function stopSummary(facts: StopFacts): string {
  return [readingsSentence(facts.ledger.impact), otherReadingsSentence(facts.ledger), answerSentence(facts), CAUSE_NOT_BUILT].filter(Boolean).join(' ');
}

export function stoppedEvent(facts: StopFacts): ProgressEvent {
  const summary = stopSummary(facts);
  const refs = [...facts.ledger.summaries.values()].flatMap((fact) => fact.evidenceIds).slice(0, 50);
  return { type: 'investigation_stopped', summary, refs, payload: { reason: facts.reason, nextStepsAvailable: false, summary } };
}

export async function postStopped(api: IncidentApi, facts: StopFacts): Promise<void> {
  try {
    await api.postEvent(stoppedEvent(facts));
  } catch (error) {
    logProgress({ stoppedEventRefused: describeError(error) });
  }
}
