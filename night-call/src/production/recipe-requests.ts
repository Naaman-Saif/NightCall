import type { JaegerSpan, JaegerTrace } from './jaeger-types';
import type { Caller, RecipeRequest } from './traffic-recipe-types';

export const FRONTEND_SERVICE = 'frontend';
export const RECOMMENDATIONS_OPERATION = 'GET /api/recommendations';

export type TimedRequest = { request: RecipeRequest; startMs: number; endMs: number };
export type TracedTraffic = { timed: TimedRequest[]; healthChecks: number };

type FoundSpan = { span: JaegerSpan; caller: Caller };

function tagOf(span: JaegerSpan, key: string): string {
  return String(span.tags.find((tag) => tag.key === key)?.value ?? '');
}

function serverSpanOf(trace: JaegerTrace): JaegerSpan | undefined {
  return trace.spans.find(
    (span) =>
      trace.processes[span.processID]?.serviceName === FRONTEND_SERVICE &&
      span.operationName === RECOMMENDATIONS_OPERATION &&
      tagOf(span, 'span.kind') !== 'client',
  );
}

export function callerOf(trace: JaegerTrace, span: JaegerSpan): Caller | 'health_check' {
  const agent = tagOf(span, 'user_agent.original') || tagOf(span, 'http.user_agent');
  if (agent.startsWith('Go-http-client')) return 'health_check';
  const services = new Set(Object.values(trace.processes).map((process) => process.serviceName));
  if (agent.includes('HeadlessChrome') || services.has('frontend-web')) return 'browser';
  if (agent.includes('python-requests') || services.has('load-generator')) return 'locust';
  return 'other';
}

function queryOf(span: JaegerSpan): URLSearchParams {
  const target = tagOf(span, 'http.target');
  const fromTarget = target.includes('?') ? target.slice(target.indexOf('?') + 1) : '';
  return new URLSearchParams((tagOf(span, 'url.query') || fromTarget).replace(/^\?/, ''));
}

function timedRequestOf({ span, caller }: FoundSpan): TimedRequest {
  const query = queryOf(span);
  const startMs = Math.floor(span.startTime / 1000);
  const ids = { productIds: query.get('productIds') ?? '', currencyCode: query.get('currencyCode') ?? 'USD' };
  const request = { offsetMs: 0, ...ids, sessionId: query.get('sessionId') ?? span.traceID, caller };
  return { request, startMs, endMs: startMs + Math.ceil(span.duration / 1000) };
}

export function tracedTraffic(traces: JaegerTrace[]): TracedTraffic {
  const timed: TimedRequest[] = [];
  let healthChecks = 0;
  for (const trace of traces) {
    const span = serverSpanOf(trace);
    const caller = span ? callerOf(trace, span) : null;
    if (caller === 'health_check') healthChecks += 1;
    if (span && caller && caller !== 'health_check') timed.push(timedRequestOf({ span, caller }));
  }
  return { timed: timed.sort((first, second) => first.startMs - second.startMs), healthChecks };
}

export function peakOverlap(timed: TimedRequest[]): number {
  const edges = timed.flatMap((item) => [
    { at: item.startMs, change: 1 },
    { at: item.endMs, change: -1 },
  ]);
  edges.sort((first, second) => first.at - second.at || first.change - second.change);
  let current = 0;
  let peak = 0;
  for (const edge of edges) {
    current += edge.change;
    peak = Math.max(peak, current);
  }
  return peak;
}
