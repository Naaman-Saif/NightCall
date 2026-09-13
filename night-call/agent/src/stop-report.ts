import type { EvidenceLedger } from './evidence-ledger.js';
import { precisePercent, type CrashReading, type FailureReading, type ImpactReadings } from './impact-facts.js';
import { requireMeasured } from './measured-guard.js';
import type { Answer, IncidentApi, ReaderName } from './incident-api.js';
import { logProgress, type ProgressEvent } from './progress.js';
import { causesLine, READER_WORDS, withoutEndMark } from './report-lines.js';
import { describeError } from './retry.js';

export type StopReason = 'answer_recorded' | 'no_answer' | 'error';

export type StopFacts = {
  ledger: EvidenceLedger;
  answer: Answer | null;
  reason: StopReason;
  asked: boolean;
  causes: number;
  mostLikely: string | null;
  mostLikelyReproduced: boolean;
  proofLines: string[];
  skipped: string[];
  fallbacks: string[];
};

const IMPACT_READERS: ReaderName[] = ['failure-rate', 'oom-events'];
const SUMMARY_CHARACTERS = 2000;

function shareText(share: number | null | undefined): string {
  return share == null ? 'not measured' : precisePercent(share);
}

function failurePart(reading: FailureReading | null): string {
  if (reading === null) return 'could not be read';
  if (reading.errorShare === null && (reading.frontendShare ?? null) === null) return 'not measured';
  return `frontend ${shareText(reading.frontendShare)}, service ${shareText(reading.errorShare)} over ${reading.windowMinutes} min`;
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
  if (!facts.asked) return 'Did not ask about customer impact.';
  if (facts.answer === null) return 'Asked about customer impact; no answer arrived in time.';
  return `Asked about customer impact; answer: ${withoutEndMark(facts.answer.text).slice(0, 300)}.`;
}

function listSentence(opening: string, items: string[]): string {
  return items.length > 0 ? `${opening}: ${[...new Set(items)].join('; ')}.` : '';
}

export function stopSummary(facts: StopFacts): string {
  const causes = causesLine({ count: facts.causes, mostLikely: facts.mostLikely, mostLikelyReproduced: facts.mostLikelyReproduced });
  const record = [...facts.proofLines, listSentence('Used the fallback model for', facts.fallbacks), listSentence('Skipped', facts.skipped)];
  const sentences = [readingsSentence(facts.ledger.impact), otherReadingsSentence(facts.ledger), answerSentence(facts), causes, ...record];
  return sentences.filter(Boolean).join(' ').slice(0, SUMMARY_CHARACTERS);
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
