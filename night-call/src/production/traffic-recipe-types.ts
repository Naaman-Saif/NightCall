export type Caller = 'browser' | 'locust' | 'other';

export type RecipeRequest = { offsetMs: number; productIds: string; currencyCode: string; sessionId: string; caller: Caller };

export type RateSample = { at: string; requestsPerSecond: number };

export type RecipeSource = 'traces' | 'prometheus_rate_fallback';

export type TrafficRecipe = {
  source: RecipeSource;
  window: { from: string; to: string };
  requests: RecipeRequest[];
  maxConcurrency: number;
  callerMix: Record<Caller, number>;
  coverage: { tracedRequests: number; promRequests: number };
  rateSeries: RateSample[];
  excludedHealthChecks: number;
};
