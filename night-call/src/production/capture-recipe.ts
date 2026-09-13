import { join } from 'node:path';

import type { EventWriter } from '../investigation/event-writer';
import { incidentFolder } from '../investigation/incident-paths';
import { replaceFile } from '../investigation/replace-file';
import { jaegerPageFetcher, tracesInPages, type TracePageFetcher } from './jaeger-pages';
import { fetchRequestRate, type RateFetcher } from './prometheus-range';
import { recipeReading } from './recipe-reading';
import { FRONTEND_SERVICE, RECOMMENDATIONS_OPERATION, tracedTraffic } from './recipe-requests';
import { recordReading } from './record-reading';
import { buildRecipe, windowBoundedByTraces } from './traffic-recipe';
import type { TrafficRecipe } from './traffic-recipe-types';

export const RECIPE_FILE = 'traffic-recipe.json';
export const RECIPE_LOOKBACK_MS = 20 * 60_000;

export type RecipeSources = { tracePage: TracePageFetcher; requestRate: RateFetcher };
export type RecipeCapture = { writer: EventWriter; incidentId: string; openedAtMs: number };

export function liveRecipeSources(): RecipeSources {
  return { tracePage: jaegerPageFetcher({ service: FRONTEND_SERVICE, operation: RECOMMENDATIONS_OPERATION }), requestRate: fetchRequestRate };
}

export function recipePath(capture: RecipeCapture): string {
  return join(incidentFolder(capture.writer.stateDir, capture.incidentId), RECIPE_FILE);
}

export async function captureTrafficRecipe(capture: RecipeCapture, sources: RecipeSources): Promise<TrafficRecipe> {
  const requested = { fromMs: capture.openedAtMs - RECIPE_LOOKBACK_MS, toMs: capture.openedAtMs };
  const traced = tracedTraffic(await tracesInPages(sources.tracePage, requested));
  const window = windowBoundedByTraces(traced, requested);
  const recipe = buildRecipe({ traced, window, rateSeries: await sources.requestRate(window) });
  replaceFile(recipePath(capture), `${JSON.stringify(recipe, null, 2)}\n`);
  await recordReading(capture.writer, { incidentId: capture.incidentId, reading: recipeReading(recipe, window) });
  return recipe;
}
