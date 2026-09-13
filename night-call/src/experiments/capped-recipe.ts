import type { RecipeRequest, TrafficRecipe } from '../production/traffic-recipe-types';

export type ReplayShape = { speed: number; capMs: number | null; requestCount: number | null };

export const REPLAY_CAP_MS = 5 * 60_000;
export const MIN_MITIGATION_REQUESTS = 200;

export function cappedRecipe(recipe: TrafficRecipe, window: { speed: number; capMs: number }): TrafficRecipe {
  const requests = recipe.requests.filter((request) => request.offsetMs / window.speed <= window.capMs);
  return { ...recipe, requests };
}

function loopedRequests(requests: RecipeRequest[], count: number): RecipeRequest[] {
  const ordered = [...requests].sort((first, second) => first.offsetMs - second.offsetMs);
  const lastOffsetMs = ordered.at(-1)?.offsetMs ?? 0;
  const loopMs = lastOffsetMs + Math.max(1, Math.round(lastOffsetMs / Math.max(1, ordered.length)));
  return Array.from({ length: count }, (_, index) => {
    const loop = Math.floor(index / ordered.length);
    const request = ordered[index % ordered.length];
    return { ...request, offsetMs: request.offsetMs + loop * loopMs };
  });
}

export function repeatedRecipe(recipe: TrafficRecipe, count: number): TrafficRecipe {
  if (recipe.requests.length === 0) return recipe;
  return { ...recipe, requests: loopedRequests(recipe.requests, count) };
}

export function shapedRecipe(recipe: TrafficRecipe, shape: ReplayShape): TrafficRecipe {
  if (shape.requestCount !== null) return repeatedRecipe(recipe, shape.requestCount);
  return cappedRecipe(recipe, { speed: shape.speed, capMs: shape.capMs ?? REPLAY_CAP_MS });
}

export function replayMinutes(recipe: TrafficRecipe, speed: number): number {
  const lastOffsetMs = Math.max(0, ...recipe.requests.map((request) => request.offsetMs));
  return lastOffsetMs / speed / 60_000;
}
