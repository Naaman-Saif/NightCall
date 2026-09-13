import type { EvidenceLedger, RecordedReading } from './evidence-ledger.js';

export type CheckFailure = { check: string; value: string };

type CauseEvidence = { claim: string; supportingEvidenceIds: string[] };

const FAILURE_CLAIM = /\b(fail|fails|failing|failed|failure|failures|errors?|erroring)\b/i;
const CRASH_CLAIM = /\b(oom|out[- ]of[- ]memory|killed|crash|crashes|crashed|crashing|restart|restarts|restarted|restarting)\b/i;
const NO_CRASHES = /^0 out-of-memory events, 0 exits and 0 starts/;
const SHARE = /(\d+(?:\.\d+)?)%/g;
const EFFECT = /\d+(?:\.\d+)?%|\b(errors?|fail\w*|crash\w*|restart\w*|oom|killed|out[- ]of[- ]memory)\b/i;
const MECHANISM = /\b(because|due to|caused by|leak\w*|grows|growth|growing|fills|filling|climbs?|climbing|ramps?|accumulat\w*|cache\w*|flag\w*|config\w*|setting\w*|change\w*|deploy\w*|release\w*|allocat\w*|unbounded|lock\w*|contention|load|traffic|bug|regression|exhaust\w*|saturat\w*|limit\w*)\b/i;

export function effectFailure(claim: string): CheckFailure | null {
  if (!EFFECT.test(claim) || MECHANISM.test(claim)) return null;
  return { check: 'effect_not_cause', value: claim.slice(0, 120) };
}

function errorSharesIn(reading: RecordedReading): number[] {
  const lines = `${reading.summary}\n${reading.excerpt}`.split('\n').filter((line) => /errors|failing/i.test(line));
  return lines.flatMap((line) => [...line.matchAll(SHARE)].map((match) => Number(match[1])));
}

export function readingContradicts(claim: string, reading: RecordedReading): boolean {
  if (reading.reader === 'failure-rate' && FAILURE_CLAIM.test(claim)) return errorSharesIn(reading).every((share) => share === 0);
  return reading.reader === 'oom-events' && CRASH_CLAIM.test(claim) && NO_CRASHES.test(reading.summary);
}

export function supportFailure(cause: CauseEvidence, ledger: EvidenceLedger): CheckFailure | null {
  const against = cause.supportingEvidenceIds.filter((id) => {
    const reading = ledger.readings.get(id);
    return reading !== undefined && readingContradicts(cause.claim, reading);
  });
  return against.length > 0 ? { check: 'supporting_reading_contradicts_claim', value: against.join(', ') } : null;
}
