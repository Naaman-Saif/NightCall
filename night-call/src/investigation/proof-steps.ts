import type { IncidentEvent } from './event-types';
import { payloadOf } from './payload-schemas';
import type { RunStep } from './run-report-types';
import type { Snapshot } from './snapshot';
import { speedWords, trafficWords } from './traffic-words';

function step(text: string, value: string): RunStep {
  return { text, value, evidenceId: null, questionId: null };
}

function observed(checks: { name: string; observed: unknown }[], name: string): string {
  const found = checks.find((check) => check.name === name);
  return found?.observed === null || found === undefined ? 'not measured' : String(found.observed);
}

export function reproductionStep(snapshot: Snapshot, event: IncidentEvent): RunStep | null {
  const { experimentId, accepted } = payloadOf(event, 'experiment_reviewed');
  const experiment = snapshot.experiments.find((item) => item.id === experimentId);
  if (!accepted || experiment?.kind !== 'reproduction' || experiment.verdict !== 'matches') return null;
  const counts = `${observed(experiment.checks, 'fault.oom_kills')} out-of-memory kills, ${observed(experiment.checks, 'fault.http_failures')} failed requests`;
  return step('Reproduced the crash in a test copy', `With ${trafficWords(experiment.trafficSource)}${speedWords(experiment.recipe.speed)}: ${counts}`);
}

export function verificationStep(snapshot: Snapshot, event: IncidentEvent): RunStep | null {
  const { approved, verificationRunId } = payloadOf(event, 'verification_reviewed');
  const rounds = snapshot.cycles.filter((cycle) => cycle.verificationRunId === verificationRunId && cycle.state === 'passed');
  if (!approved || rounds.length !== 3) return null;
  return step('Verified the fix', `3 of 3 rounds passed in fresh test copies${speedWords(rounds[0].speed)}`);
}

export function publicationStep(event: IncidentEvent): RunStep | null {
  const { state, number, url, failureReason } = payloadOf(event, 'publication_changed');
  if (state === 'published') return step('Opened a pull request', `PR #${number}: ${url}`);
  if (state === 'failed') return step('Pull request failed to open', String(failureReason));
  return null;
}
