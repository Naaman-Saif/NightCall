import type { JaegerTrace } from './jaeger-types';
import { callerSequence } from './recipe-fallback';
import { tracedTraffic } from './recipe-requests';
import { buildRecipe, windowBoundedByTraces } from './traffic-recipe';

type TraceShape = { startMs: number; durationMs: number; agent: string; services?: string[]; query?: string };

const openedAtMs = Date.parse('2026-09-13T18:00:00.000Z');

function trace(id: string, shape: TraceShape): JaegerTrace {
  const processes: JaegerTrace['processes'] = { p1: { serviceName: 'frontend' } };
  (shape.services ?? []).forEach((serviceName, index) => (processes[`p${index + 2}`] = { serviceName }));
  const query = shape.query ?? `productIds=P${id}&sessionId=session-${id}&currencyCode=EUR`;
  const tags = [
    { key: 'span.kind', value: 'server' },
    { key: 'user_agent.original', value: shape.agent },
    { key: 'url.query', value: query },
  ];
  const span = { traceID: id, spanID: `${id}s`, operationName: 'GET /api/recommendations', startTime: shape.startMs * 1000, duration: shape.durationMs * 1000, processID: 'p1', tags };
  return { traceID: id, spans: [span], processes };
}

const browser = (id: string, startMs: number) => trace(id, { startMs, durationMs: 300, agent: 'Mozilla/5.0 HeadlessChrome/120', services: ['frontend-web'] });
const locust = (id: string, startMs: number) => trace(id, { startMs, durationMs: 300, agent: 'python-requests/2.31', services: ['load-generator'] });
const healthCheck = (id: string, startMs: number) => trace(id, { startMs, durationMs: 5, agent: 'Go-http-client/1.1' });

const requested = { fromMs: openedAtMs - 20 * 60_000, toMs: openedAtMs };

describe('traffic recipe from traces', () => {
  it('keeps browser and locust requests in order, drops health checks and measures overlap', () => {
    const traces = [locust('c', openedAtMs - 59_800), healthCheck('h', openedAtMs - 59_900), browser('b', openedAtMs - 59_900), locust('a', openedAtMs - 60_000)];
    const traced = tracedTraffic(traces);
    const window = windowBoundedByTraces(traced, requested);
    const recipe = buildRecipe({ traced, window, rateSeries: [{ at: new Date(openedAtMs).toISOString(), requestsPerSecond: 0.05 }] });
    expect(window.fromMs).toBe(openedAtMs - 60_000);
    expect(recipe).toMatchObject({ source: 'traces', maxConcurrency: 3, excludedHealthChecks: 1, coverage: { tracedRequests: 3, promRequests: 3 } });
    expect(recipe.callerMix).toEqual({ browser: 1, locust: 2, other: 0 });
    expect(recipe.requests).toEqual([
      { offsetMs: 0, productIds: 'Pa', currencyCode: 'EUR', sessionId: 'session-a', caller: 'locust' },
      { offsetMs: 100, productIds: 'Pb', currencyCode: 'EUR', sessionId: 'session-b', caller: 'browser' },
      { offsetMs: 200, productIds: 'Pc', currencyCode: 'EUR', sessionId: 'session-c', caller: 'locust' },
    ]);
  });

  it('falls back to the Prometheus rate spread over the caller mix when traces cover less than half', () => {
    const traced = tracedTraffic([browser('b', openedAtMs - 90_000), locust('a', openedAtMs - 100_000)]);
    const window = { fromMs: openedAtMs - 120_000, toMs: openedAtMs };
    const rateSeries = [
      { at: new Date(openedAtMs - 60_000).toISOString(), requestsPerSecond: 0.5 },
      { at: new Date(openedAtMs).toISOString(), requestsPerSecond: 0.5 },
    ];
    const recipe = buildRecipe({ traced, window, rateSeries });
    expect(recipe).toMatchObject({ source: 'prometheus_rate_fallback', coverage: { tracedRequests: 2, promRequests: 60 } });
    expect(recipe.requests).toHaveLength(60);
    expect(recipe.requests[1].offsetMs).toBe(2000);
    expect(recipe.requests.filter((request) => request.caller === 'browser')).toHaveLength(30);
    expect(recipe.requests.every((request, index) => index === 0 || request.offsetMs >= recipe.requests[index - 1].offsetMs)).toBe(true);
  });

  it('spreads callers in proportion to what was observed', () => {
    const sequence = callerSequence({ browser: 1, locust: 3, other: 0 }, 8);
    expect(sequence.filter((caller) => caller === 'browser')).toHaveLength(2);
    expect(sequence.filter((caller) => caller === 'locust')).toHaveLength(6);
    expect(callerSequence({ browser: 0, locust: 0, other: 0 }, 2)).toEqual(['locust', 'locust']);
  });
});
