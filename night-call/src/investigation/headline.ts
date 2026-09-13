import { clock, investigationSentence } from './investigation-sentence';
import { activitySentence } from './run-activity';
import type { CrashCounts, Snapshot } from './snapshot';

const ESTABLISHED_CAUSE = 'The cause is established by an accepted reproduction.';
const UNKNOWN_CAUSE = 'The cause is not established.';

function times(count: number): string {
  return count === 1 ? 'once' : `${count} times`;
}

function serviceName(service: string): string {
  return service.charAt(0).toUpperCase() + service.slice(1);
}

function latestCrashCounts(snapshot: Snapshot): CrashCounts | null {
  const counted = Object.values(snapshot.evidence).filter((item) => item.crashCounts !== null);
  return counted.at(-1)?.crashCounts ?? null;
}

function crashPhrase(counts: CrashCounts): string {
  const stopped = counts.oom > 0 ? 'ran out of memory' : 'exited';
  const stops = counts.oom > 0 ? counts.oom : counts.die;
  if (counts.start === 0) return `${stopped} ${times(stops)} and has not restarted`;
  if (stops === counts.start) return `${stopped} and restarted ${times(stops)}`;
  return `${stopped} ${times(stops)} and restarted ${times(counts.start)}`;
}

function openingSentence(snapshot: Snapshot): string {
  const { service, alertName, severity, startedAt } = snapshot.incident;
  const counts = latestCrashCounts(snapshot);
  if (counts && counts.oom + counts.die > 0) return `${serviceName(service)} ${crashPhrase(counts)} since ${clock(counts.since)}.`;
  if (severity === 'manual') return `An investigation of ${service} was started by hand at ${clock(startedAt)}.`;
  return `Alert ${alertName} fired for ${service} at ${clock(startedAt)}.`;
}

function causeIsEstablished(snapshot: Snapshot): boolean {
  const supported = new Set(snapshot.hypotheses.filter((hypothesis) => hypothesis.status === 'supported').map((hypothesis) => hypothesis.id));
  return snapshot.experiments.some(
    (experiment) =>
      experiment.kind === 'reproduction' &&
      supported.has(experiment.hypothesisId) &&
      experiment.verdict === 'matches' &&
      experiment.review?.accepted === true,
  );
}

function causeClause(snapshot: Snapshot): string {
  if (causeIsEstablished(snapshot)) return ESTABLISHED_CAUSE;
  const causes = snapshot.runReport.causes;
  const supported = causes.filter((cause) => cause.status === 'supported').at(-1);
  if (supported) return `Most likely cause: ${supported.claim.trim().replace(/[.\s]+$/, '')}, not yet reproduced.`;
  const possible = causes.filter((cause) => cause.status === 'proposed').length;
  return possible > 0 ? `Possible causes: ${possible}, none established yet.` : UNKNOWN_CAUSE;
}

export function headlineOf(snapshot: Snapshot): string {
  const cause = causeClause(snapshot);
  if (snapshot.investigation === 'stopped') return `${openingSentence(snapshot)} ${activitySentence(snapshot)} ${cause}`;
  return `${openingSentence(snapshot)} ${cause} ${investigationSentence(snapshot)}`;
}

export function withHeadline(snapshot: Snapshot): Snapshot {
  return { ...snapshot, headline: headlineOf(snapshot) };
}
