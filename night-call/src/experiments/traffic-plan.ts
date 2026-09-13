import { UnprocessableEntityException } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { RECIPE_FILE } from '../production/capture-recipe';
import type { TrafficRecipe } from '../production/traffic-recipe-types';
import { REPLAY_CAP_MS, replayMinutes, shapedRecipe, type ReplayShape } from './capped-recipe';

export type TrafficChoice = 'incident_traffic' | 'fixed_fallback';
export type TrafficSource = 'traces' | 'prometheus_rate_fallback' | 'fixed_fallback';
export type TrafficPlan = { source: TrafficSource; recipePath: string | null; count: number; pacingMs: number; replayMinutes: number; shape: ReplayShape };
export type TrafficRequest = { recipe: TrafficChoice; speed: number; requestCount: number | null };
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

function fixedPlan(request: TrafficRequest): TrafficPlan {
  const count = request.requestCount ?? FIXED_COUNT;
  const shape = { speed: 1, capMs: null, requestCount: count };
  return { source: 'fixed_fallback', recipePath: null, count, pacingMs: FIXED_PACING_MS, replayMinutes: (count * FIXED_PACING_MS) / 60_000, shape };
}

export function trafficPlanOf(folder: string, request: TrafficRequest): TrafficPlan {
  if (request.recipe === 'fixed_fallback') return fixedPlan(request);
  const recipe = storedRecipe(folder);
  if (!recipe) throw new UnprocessableEntityException({ code: 'recipe_missing' });
  const capMs = request.requestCount === null ? REPLAY_CAP_MS : null;
  const shape = { speed: request.speed, capMs, requestCount: request.requestCount };
  const shaped = shapedRecipe(recipe, shape);
  const recipePath = resolve(folder, RECIPE_FILE);
  return { source: recipe.source, recipePath, count: shaped.requests.length, pacingMs: 0, replayMinutes: replayMinutes(shaped, request.speed), shape };
}

export function estimatedMinutesOf(plan: TrafficPlan, warm: boolean): number {
  return Math.ceil((warm ? 0 : COLD_START_MINUTES) + plan.replayMinutes + COLLECTION_MINUTES);
}
