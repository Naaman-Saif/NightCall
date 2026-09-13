import { UnprocessableEntityException } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { RECIPE_FILE } from '../production/capture-recipe';
import type { TrafficRecipe } from '../production/traffic-recipe-types';
import { cappedRecipe, REPLAY_CAP_MS, replayMinutes } from './capped-recipe';

export type TrafficChoice = 'incident_traffic' | 'fixed_fallback';
export type TrafficSource = 'traces' | 'prometheus_rate_fallback' | 'fixed_fallback';
export type TrafficPlan = { source: TrafficSource; recipePath: string | null; count: number; pacingMs: number; replayMinutes: number };
export type RecipeSummary = { present: boolean; source: TrafficSource | null; requests: number };

const FIXED_COUNT = 400;
const FIXED_PACING_MS = 200;
const COLD_START_MINUTES = 3;
const COLLECTION_MINUTES = 1;

function storedRecipe(folder: string): TrafficRecipe | null {
  const path = join(folder, RECIPE_FILE);
  if (!existsSync(path)) return null;
  try {
    const recipe = JSON.parse(readFileSync(path, 'utf8')) as TrafficRecipe;
    return Array.isArray(recipe.requests) && recipe.requests.length > 0 ? recipe : null;
  } catch {
    return null;
  }
}

export function recipeSummaryOf(folder: string): RecipeSummary {
  const recipe = storedRecipe(folder);
  return { present: recipe !== null, source: recipe?.source ?? null, requests: recipe?.requests.length ?? 0 };
}

export function trafficPlanOf(folder: string, choice: { recipe: TrafficChoice; speed: number }): TrafficPlan {
  if (choice.recipe === 'fixed_fallback') {
    const minutes = (FIXED_COUNT * FIXED_PACING_MS) / 60_000;
    return { source: 'fixed_fallback', recipePath: null, count: FIXED_COUNT, pacingMs: FIXED_PACING_MS, replayMinutes: minutes };
  }
  const recipe = storedRecipe(folder);
  if (!recipe) throw new UnprocessableEntityException({ code: 'recipe_missing' });
  const capped = cappedRecipe(recipe, { speed: choice.speed, capMs: REPLAY_CAP_MS });
  const recipePath = resolve(folder, RECIPE_FILE);
  return { source: recipe.source, recipePath, count: capped.requests.length, pacingMs: 0, replayMinutes: replayMinutes(capped, choice.speed) };
}

export function estimatedMinutesOf(plan: TrafficPlan, warm: boolean): number {
  return Math.ceil((warm ? 0 : COLD_START_MINUTES) + plan.replayMinutes + COLLECTION_MINUTES);
}
