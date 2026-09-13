import { urlFor } from '../config/hosts';
import { productionTarget } from '../config/targets';
import { summarizeErrorSpans } from '../evidence/traces';
import { excerptOf, momentMinutesAgo, type Reading } from './reading';

export type TracesQuery = { service: string; minutes: number; traceIds: string[] };

type JaegerTraces = Parameters<typeof summarizeErrorSpans>[0];

const TRACE_TIMEOUT_MS = 10_000;

async function jaegerTraces(path: string): Promise<JaegerTraces> {
  const base = await urlFor(productionTarget(), 'jaeger');
  const response = await fetch(`${base}/jaeger/ui/api${path}`, { signal: AbortSignal.timeout(TRACE_TIMEOUT_MS) });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`jaeger answered ${response.status}`);
  return ((await response.json()) as { data?: JaegerTraces }).data ?? [];
}

function recentErrorsPath(query: TracesQuery): string {
  const end = Date.now() * 1000;
  const start = momentMinutesAgo(query.minutes) * 1000;
  const tags = encodeURIComponent(JSON.stringify({ error: 'true' }));
  return `/traces?service=${encodeURIComponent(query.service)}&tags=${tags}&start=${start}&end=${end}&limit=20`;
}

function summaryOf(query: TracesQuery, counts: { traces: number; errors: number }): string {
  if (query.traceIds.length > 0) return `${counts.traces} of ${query.traceIds.length} traces found, ${counts.errors} error spans`;
  return `${counts.errors} error spans in ${counts.traces} traces from ${query.service} in the last ${query.minutes} minutes`;
}

export async function readProductionTraces(query: TracesQuery): Promise<Reading> {
  const paths = query.traceIds.length > 0 ? query.traceIds.map((id) => `/traces/${id}`) : [recentErrorsPath(query)];
  const traces = (await Promise.all(paths.map(jaegerTraces))).flat();
  const errors = summarizeErrorSpans(traces);
  const lines = errors.map((span) => `${span.traceId} ${span.operation} ${span.durationMs} ms ${span.message}`);
  const summary = summaryOf(query, { traces: traces.length, errors: errors.length });
  const data = { traceIds: traces.map((trace) => trace.traceID), errors };
  return { kind: 'traces', source: `jaeger: ${query.service}`, summary, excerpt: excerptOf(lines), data };
}
