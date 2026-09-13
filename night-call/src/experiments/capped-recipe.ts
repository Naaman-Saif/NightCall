import type { TrafficRecipe } from '../production/traffic-recipe-types';

export type ReplayWindow = { speed: number; capMs: number };

export const REPLAY_CAP_MS = 5 * 60_000;

export function cappedRecipe(recipe: TrafficRecipe, window: ReplayWindow): TrafficRecipe {
  const requests = recipe.requests.filter((request) => request.offsetMs / window.speed <= window.capMs);
  return { ...recipe, requests };
}

export function replayMinutes(recipe: TrafficRecipe, speed: number): number {
  const lastOffsetMs = Math.max(0, ...recipe.requests.map((request) => request.offsetMs));
  return lastOffsetMs / speed / 60_000;
}
