import type { TraceWindow } from './jaeger-pages';
import { REQUEST_RATE_QUERY } from './prometheus-range';
import { excerptOf, type Reading } from './reading';
import { FRONTEND_SERVICE, RECOMMENDATIONS_OPERATION } from './recipe-requests';
import { grafanaExploreLink, jaegerSearchLink } from './source-links';
import type { TrafficRecipe } from './traffic-recipe-types';

function originText(recipe: TrafficRecipe): string {
  return recipe.source === 'traces' ? 'from traces' : 'rebuilt from the Prometheus request rate because traces covered too little';
}

function excerptLines(recipe: TrafficRecipe): string[] {
  const mix = Object.entries(recipe.callerMix).map(([caller, count]) => `${caller}: ${count}`).join(', ');
  return [
    `source: ${recipe.source}`,
    `window: ${recipe.window.from} to ${recipe.window.to}`,
    `callers: ${mix}`,
    `health checks excluded: ${recipe.excludedHealthChecks}`,
    `max concurrency: ${recipe.maxConcurrency}`,
  ];
}

export function recipeReading(recipe: TrafficRecipe, window: TraceWindow): Reading {
  const minutes = Math.round((window.toMs - window.fromMs) / 60_000);
  const { tracedRequests, promRequests } = recipe.coverage;
  const counts = `${tracedRequests} traced, ${promRequests} counted by Prometheus`;
  const opening = `Captured ${recipe.requests.length} recommendation requests over ${minutes} min before the incident opened`;
  const summary = `${opening}, ${originText(recipe)} (${counts}), up to ${recipe.maxConcurrency} at once`;
  const range = { fromMs: window.fromMs, toMs: window.toMs };
  const sourceLinks = [
    jaegerSearchLink({ service: FRONTEND_SERVICE, operation: RECOMMENDATIONS_OPERATION, range, errorsOnly: false }),
    grafanaExploreLink({ label: 'Grafana: recommendation request rate, same window', expr: REQUEST_RATE_QUERY }, range),
  ];
  const data = { source: recipe.source, coverage: recipe.coverage, maxConcurrency: recipe.maxConcurrency, callerMix: recipe.callerMix };
  const reading = { kind: 'traffic_recipe', source: 'jaeger and prometheus: recommendation requests', summary, excerpt: excerptOf(excerptLines(recipe)), data } as const;
  return { ...reading, value: `${recipe.requests.length} requests from ${recipe.source}`, observedAt: recipe.window.to, sourceLinks };
}
