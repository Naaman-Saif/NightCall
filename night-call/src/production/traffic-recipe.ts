import type { TraceWindow } from './jaeger-pages';
import { fallbackRequests } from './recipe-fallback';
import { peakOverlap, type TracedTraffic } from './recipe-requests';
import type { Caller, RateSample, RecipeRequest, TrafficRecipe } from './traffic-recipe-types';

export const COVERAGE_SHARE = 0.5;

export type RecipeInput = { traced: TracedTraffic; window: TraceWindow; rateSeries: RateSample[] };

function callerMixOf(requests: RecipeRequest[]): Record<Caller, number> {
  const mix: Record<Caller, number> = { browser: 0, locust: 0, other: 0 };
  requests.forEach((request) => (mix[request.caller] += 1));
  return mix;
}

export function promRequestsOf(rateSeries: RateSample[]): number {
  return Math.round(rateSeries.reduce((total, sample) => total + sample.requestsPerSecond * 60, 0));
}

export function windowBoundedByTraces(traced: TracedTraffic, requested: TraceWindow): TraceWindow {
  const firstStartMs = traced.timed[0]?.startMs;
  return { fromMs: firstStartMs === undefined ? requested.fromMs : Math.max(requested.fromMs, firstStartMs), toMs: requested.toMs };
}

export function buildRecipe(input: RecipeInput): TrafficRecipe {
  const traced = input.traced.timed.map(({ request, startMs }) => ({ ...request, offsetMs: startMs - input.window.fromMs }));
  const coverage = { tracedRequests: traced.length, promRequests: promRequestsOf(input.rateSeries) };
  const callerMix = callerMixOf(traced);
  const window = { from: new Date(input.window.fromMs).toISOString(), to: new Date(input.window.toMs).toISOString() };
  const maxConcurrency = Math.max(1, peakOverlap(input.traced.timed));
  const shared = { window, maxConcurrency, callerMix, coverage, rateSeries: input.rateSeries, excludedHealthChecks: input.traced.healthChecks };
  if (coverage.tracedRequests >= coverage.promRequests * COVERAGE_SHARE) return { ...shared, source: 'traces', requests: traced };
  const requests = fallbackRequests({ rateSeries: input.rateSeries, window: input.window, callerMix });
  return { ...shared, source: 'prometheus_rate_fallback', requests };
}
