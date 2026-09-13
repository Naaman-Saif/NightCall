import { readFileSync, writeFileSync } from 'node:fs';

import { readSnapshot } from '../investigation/incident-catalog';
import { freshWriter, openIncident } from '../investigation/writer.fixture';
import { recipeReplayFromArgs, roundWorkloadOf } from '../sandbox-copy/round-workload';
import { captureTrafficRecipe, recipePath } from './capture-recipe';
import type { JaegerTrace } from './jaeger-types';
import type { SourceLink } from './source-links';
import type { TrafficRecipe } from './traffic-recipe-types';

function locustTrace(id: string, startMs: number): JaegerTrace {
  const tags = [
    { key: 'user_agent.original', value: 'python-requests/2.31' },
    { key: 'url.query', value: `productIds=OLJCESPC7Z&sessionId=${id}&currencyCode=USD` },
  ];
  const span = { traceID: id, spanID: 's', operationName: 'GET /api/recommendations', startTime: startMs * 1000, duration: 200_000, processID: 'p1', tags };
  return { traceID: id, spans: [span], processes: { p1: { serviceName: 'frontend' }, p2: { serviceName: 'load-generator' } } };
}

async function capturedRecipe() {
  const writer = freshWriter();
  const incidentId = await openIncident(writer);
  const openedAtMs = Date.parse('2026-09-13T18:00:00.000Z');
  const sources = {
    tracePage: async () => [locustTrace('a', openedAtMs - 120_000), locustTrace('b', openedAtMs - 60_000)],
    requestRate: async () => [{ at: new Date(openedAtMs).toISOString(), requestsPerSecond: 1 / 60 }],
  };
  const capture = { writer, incidentId, openedAtMs };
  const recipe = await captureTrafficRecipe(capture, sources);
  return { writer, incidentId, openedAtMs, recipe, path: recipePath(capture) };
}

describe('traffic recipe capture', () => {
  it('stores the recipe in the incident folder and records evidence with the exact Jaeger window and Prometheus query', async () => {
    const { writer, incidentId, openedAtMs, recipe, path } = await capturedRecipe();
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(recipe);
    expect(recipe).toMatchObject({ source: 'traces', coverage: { tracedRequests: 2, promRequests: 1 } });
    const evidence = Object.values(readSnapshot(writer.stateDir, incidentId)?.evidence ?? {}).find((item) => item.kind === 'traffic_recipe');
    expect(evidence?.summary).toBe('Captured 2 recommendation requests over 2 min before the incident opened, from traces (2 traced, 1 counted by Prometheus), up to 1 at once');
    const [jaeger, prometheus] = evidence?.sourceLinks as SourceLink[];
    const params = new URL(jaeger.url).searchParams;
    expect(params.get('operation')).toBe('GET /api/recommendations');
    expect(params.get('start')).toBe(String((openedAtMs - 120_000) * 1000));
    expect(params.get('end')).toBe(String(openedAtMs * 1000));
    expect(decodeURIComponent(prometheus.url)).toContain('traces_span_metrics_calls_total');
  });

  it('loads a stored recipe for a sandbox round with an explicit speed and records how the round replayed it', async () => {
    const { path, recipe } = await capturedRecipe();
    const replay = recipeReplayFromArgs(['node', 'run-one-round.js', 'run-1', '--recipe', path]);
    expect(replay).toMatchObject({ speed: 1, recipePath: path });
    expect(roundWorkloadOf(replay, 400)).toEqual({ mode: 'recipe', recipeSource: 'traces', speed: 1, plannedRequests: 2, maxConcurrency: recipe.maxConcurrency });
    expect(roundWorkloadOf(null, 400)).toEqual({ mode: 'fixed_fallback', recipeSource: null, speed: 1, plannedRequests: 400, maxConcurrency: 1 });
    expect(() => recipeReplayFromArgs(['--recipe', path, '--speed', '0'])).toThrow('--speed must be a positive number');
    const empty: TrafficRecipe = { ...recipe, requests: [] };
    writeFileSync(path, JSON.stringify(empty));
    expect(() => recipeReplayFromArgs(['--recipe', path])).toThrow('has no requests');
  });
});
