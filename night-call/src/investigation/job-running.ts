import type { Snapshot } from './snapshot';

export const JOB_ACTIVITY_TYPES = new Set<string>([
  'experiment_started',
  'experiment_progress',
  'experiment_finished',
  'verification_started',
  'cycle_started',
  'cycle_finished',
]);

export function proofJobIsRunning(snapshot: Snapshot): boolean {
  const experimentRunning = snapshot.experiments.some((experiment) => experiment.finishedAt === null);
  return experimentRunning || snapshot.cycles.some((cycle) => cycle.state === 'running');
}
