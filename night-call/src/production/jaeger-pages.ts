import { urlFor } from '../config/hosts';
import { productionTarget } from '../config/targets';
import type { JaegerTrace } from './jaeger-types';

export const JAEGER_PAGE_LIMIT = 500;
export const MAX_TRACE_PAGES = 12;
export const MAX_TRACE_WINDOW_MS = 20 * 60_000;

const PAGE_TIMEOUT_MS = 15_000;

export type TraceWindow = { fromMs: number; toMs: number };
export type TraceQuery = { service: string; operation: string };
export type TracePageFetcher = (window: TraceWindow) => Promise<JaegerTrace[]>;

function earliestStartMs(traces: JaegerTrace[]): number {
  return Math.min(...traces.flatMap((trace) => trace.spans.map((span) => Math.floor(span.startTime / 1000))));
}

function boundedWindow(window: TraceWindow): TraceWindow {
  return { fromMs: Math.max(window.fromMs, window.toMs - MAX_TRACE_WINDOW_MS), toMs: window.toMs };
}

export async function tracesInPages(fetchPage: TracePageFetcher, requested: TraceWindow): Promise<JaegerTrace[]> {
  const window = boundedWindow(requested);
  const found = new Map<string, JaegerTrace>();
  let toMs = window.toMs;
  for (let page = 0; page < MAX_TRACE_PAGES; page += 1) {
    const traces = await fetchPage({ fromMs: window.fromMs, toMs });
    traces.forEach((trace) => found.set(trace.traceID, trace));
    const nextToMs = traces.length < JAEGER_PAGE_LIMIT ? window.fromMs : earliestStartMs(traces);
    if (nextToMs <= window.fromMs || nextToMs >= toMs) break;
    toMs = nextToMs;
  }
  return [...found.values()];
}

export function jaegerPageFetcher(query: TraceQuery): TracePageFetcher {
  return async (window) => {
    const limits = { start: String(window.fromMs * 1000), end: String(window.toMs * 1000), limit: String(JAEGER_PAGE_LIMIT) };
    const params = new URLSearchParams({ service: query.service, operation: query.operation, ...limits });
    const base = await urlFor(productionTarget(), 'jaeger');
    const response = await fetch(`${base}/jaeger/ui/api/traces?${params.toString()}`, { signal: AbortSignal.timeout(PAGE_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`jaeger answered ${response.status}`);
    return ((await response.json()) as { data?: JaegerTrace[] }).data ?? [];
  };
}
