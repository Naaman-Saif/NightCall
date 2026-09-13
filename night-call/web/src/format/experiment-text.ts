import type { Experiment, ExperimentProgress, Recipe } from '../api/contract';
import { bytesToMib } from './series-points';

export const EXPERIMENT_KIND_TEXT: Record<Experiment['kind'], string> = {
  reproduction: 'Reproduction experiment',
  mitigation: 'Mitigation experiment',
};

export function describeRecipe(recipe: Recipe): string {
  const restart = recipe.restart ? 'restart first' : 'no restart';
  const stop = recipe.stopOnFailure ? ', stop at the first failure' : '';
  return `Flag ${recipe.flagVariant}, ${restart}, up to ${recipe.count} requests every ${recipe.pacingMs} ms${stop}`;
}

export function describeProgress(progress: ExperimentProgress | null): string {
  if (!progress) return 'No measurements yet';
  const memory = `peak memory ${bytesToMib(progress.peakMemoryBytes)} MiB`;
  const cpu = `peak CPU ${Math.round(progress.peakCpuPercent)} percent`;
  return `${progress.requests} requests, ${progress.errors} errors, ${memory}, ${cpu}`;
}
