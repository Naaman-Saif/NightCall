import { urlFor } from '../config/hosts';
import { productionTarget } from '../config/targets';
import type { TraceWindow } from './jaeger-pages';
import type { RateSample } from './traffic-recipe-types';

export const REQUEST_RATE_QUERY =
  'sum(increase(traces_span_metrics_calls_total{service_name="recommendation",span_kind="SPAN_KIND_SERVER"}[2m]))/120';

const STEP_SECONDS = 60;
const QUERY_TIMEOUT_MS = 10_000;

export type RangeReply = { data?: { result?: { values?: [number, string][] }[] } };
export type RateFetcher = (window: TraceWindow) => Promise<RateSample[]>;

export function rateSamplesOf(reply: RangeReply): RateSample[] {
  const values = reply.data?.result?.[0]?.values ?? [];
  const samples = values.map(([seconds, value]) => ({ at: new Date(seconds * 1000).toISOString(), requestsPerSecond: Number(value) }));
  return samples.filter((sample) => Number.isFinite(sample.requestsPerSecond));
}

export async function fetchRequestRate(window: TraceWindow): Promise<RateSample[]> {
  const bounds = { start: String(Math.floor(window.fromMs / 1000)), end: String(Math.ceil(window.toMs / 1000)), step: String(STEP_SECONDS) };
  const params = new URLSearchParams({ query: REQUEST_RATE_QUERY, ...bounds });
  const base = await urlFor(productionTarget(), 'prometheus');
  const response = await fetch(`${base}/api/v1/query_range?${params.toString()}`, { signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`prometheus answered ${response.status}`);
  return rateSamplesOf((await response.json()) as RangeReply);
}
