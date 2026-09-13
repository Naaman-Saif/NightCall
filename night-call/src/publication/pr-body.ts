import type { IncidentEvent } from '../investigation/event-types';

type Payload = Record<string, unknown>;
type Check = { name: string; passed: boolean; observed: unknown };

type Search = { type: string; matches?: (payload: Payload) => boolean };

function latestIn(events: IncidentEvent[], search: Search): IncidentEvent | undefined {
  const matches = search.matches ?? (() => true);
  return events.filter((event) => event.type === search.type && matches(event.payload)).at(-1);
}

function checkLines(checks: unknown): string[] {
  return ((checks as Check[] | undefined) ?? []).map((check) => `- ${check.name}: observed ${String(check.observed)} (${check.passed ? 'passed' : 'failed'})`);
}

function bullets(values: unknown): string[] {
  return ((values as string[] | undefined) ?? []).map((value) => `- ${value}`);
}

function situation(events: IncidentEvent[]): string[] {
  const alert = events[0];
  const question = latestIn(events, { type: 'question_asked', matches: (payload) => payload.questionId === 'q-impact' });
  const answer = latestIn(events, { type: 'context_supplied', matches: (payload) => payload.questionId === 'q-impact' });
  const brief = latestIn(events, { type: 'brief_updated' });
  const lines = ['## Incident', `${alert.summary} (alert ${String(alert.payload.alertName)}, opened ${alert.occurredAt})`];
  if (brief) lines.push('', '## Brief', brief.summary);
  if (question) lines.push('', '## Customer impact', `Question: ${String(question.payload.text)}`, `Answer: ${answer ? String(answer.payload.text) : 'no answer recorded'}`);
  return lines;
}

function reproduction(events: IncidentEvent[]): string[] {
  const review = latestIn(events, { type: 'experiment_reviewed', matches: (payload) => payload.accepted === true });
  const experimentId = review?.payload.experimentId;
  const finished = latestIn(events, { type: 'experiment_finished', matches: (payload) => payload.experimentId === experimentId });
  if (!review || !finished) return [];
  return ['', '## Reproduction', finished.summary, ...checkLines(finished.payload.checks), 'Verifier reasons:', ...bullets(review.payload.reasons)];
}

function verification(events: IncidentEvent[], runId: unknown): string[] {
  const rounds = events.filter((event) => event.type === 'cycle_finished' && event.payload.verificationRunId === runId);
  const roundLines = rounds.flatMap((round) => [`Round ${String(round.payload.cycle)} (replayed at ${String(round.payload.speed ?? 1)}x speed): ${round.payload.passed ? 'passed' : 'failed'}`, ...checkLines(round.payload.checks)]);
  const review = latestIn(events, { type: 'verification_reviewed', matches: (payload) => payload.verificationRunId === runId && payload.approved === true });
  return ['', '## Verification', ...roundLines, 'Verifier reasons:', ...bullets(review?.payload.reasons), '', '3/3 verification cycles passed under the recorded conditions.'];
}

export function prBodyOf(events: IncidentEvent[]): string {
  const mitigation = latestIn(events, { type: 'mitigation_proposed' });
  const run = latestIn(events, { type: 'verification_started' });
  const fix = mitigation ? ['', '## Change', String(mitigation.payload.explanation), '', '```diff', String(mitigation.payload.diff), '```'] : [];
  const caveats = mitigation ? ['', '## Caveats', ...bullets(mitigation.payload.caveats), '', '## Not fixed', String(mitigation.payload.notFixed)] : [];
  const body = [...situation(events), ...reproduction(events), ...fix, ...verification(events, run?.payload.verificationRunId), ...caveats];
  return [...body, '', 'Opened by NightCall from the incident event log.'].join('\n');
}
