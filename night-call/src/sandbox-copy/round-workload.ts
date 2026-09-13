import { readFileSync } from 'node:fs';

import type { RecipeSource, TrafficRecipe } from '../production/traffic-recipe-types';

export type RecipeReplay = { recipe: TrafficRecipe; speed: number; recipePath: string };

export type RoundWorkload = {
  mode: 'recipe' | 'fixed_fallback';
  recipeSource: RecipeSource | null;
  speed: number;
  plannedRequests: number;
  maxConcurrency: number;
};

const replayState: { active: RecipeReplay | null } = { active: null };

function argumentAfter(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

export function recipeReplayFromArgs(argv: string[]): RecipeReplay | null {
  const recipePath = argumentAfter(argv, '--recipe');
  if (!recipePath) return null;
  const speed = Number(argumentAfter(argv, '--speed') ?? '1');
  if (!Number.isFinite(speed) || speed <= 0) throw new Error(`--speed must be a positive number, got ${speed}`);
  const recipe = JSON.parse(readFileSync(recipePath, 'utf8')) as TrafficRecipe;
  if (!Array.isArray(recipe.requests) || recipe.requests.length === 0) throw new Error(`recipe ${recipePath} has no requests`);
  return { recipe, speed, recipePath };
}

export function useRecipeReplay(replay: RecipeReplay | null): void {
  replayState.active = replay;
}

export function activeRecipeReplay(): RecipeReplay | null {
  return replayState.active;
}

export function roundWorkloadOf(replay: RecipeReplay | null | undefined, fixedCount: number): RoundWorkload {
  if (!replay) return { mode: 'fixed_fallback', recipeSource: null, speed: 1, plannedRequests: fixedCount, maxConcurrency: 1 };
  const { recipe, speed } = replay;
  return { mode: 'recipe', recipeSource: recipe.source, speed, plannedRequests: recipe.requests.length, maxConcurrency: recipe.maxConcurrency };
}
