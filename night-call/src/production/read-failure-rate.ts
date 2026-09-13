import { urlFor } from '../config/hosts';
import { productionTarget } from '../config/targets';
import {
  canaryQuery,
  errorShare,
  percentText,
  rateWindowMinutes,
  RECOMMENDATION_SPANS,
  spanQueries,
  type SpanTarget,
} from './failure-rate-query';
import { failureData, failureFactsOf, failureSummary, failureValue } from './failure-rate-summary';
import { excerptOf, type Reading } from './reading';
import { grafanaExploreLink, rangeOfMinutes, type SourceLink } from './source-links';

type PrometheusVector = { data?: { result?: { value?: [number, string] }[] } };

const QUERY_TIMEOUT_MS = 10_000;

async function prometheusScalar(query: string): Promise<number | null> {
  const base = await urlFor(productionTarget(), 'prometheus');
  const address = `${base}/api/v1/query?query=${encodeURIComponent(query)}`;
  const response = await fetch(address, { signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`prometheus answered ${response.status}`);
  const value = ((await response.json()) as PrometheusVector).data?.result?.[0]?.value?.[1];
  return value === undefined ? null : Number(value);
}

async function spanRate(target: SpanTarget, minutes: number) {
  const queries = spanQueries(target, minutes);
  const [errors, total] = await Promise.all([prometheusScalar(queries.errors), prometheusScalar(queries.total)]);
  return { ...target, errorsPerSecond: errors, callsPerSecond: total, errorShare: errorShare({ errors, total }) };
}

function canaryLine(canary: number | null): string {
  if (canary === null) return 'canary /api/recommendations: no httpcheck target configured';
  return `canary /api/recommendations: ${percentText(canary)} of checks healthy`;
}

function failureLinks(minutes: number): SourceLink[] {
  const range = rangeOfMinutes(rateWindowMinutes(minutes));
  const spanLinks = RECOMMENDATION_SPANS.flatMap((target) => {
    const queries = spanQueries(target, minutes);
    const errors = grafanaExploreLink({ label: `Grafana: ${target.service} error calls per second`, expr: queries.errors }, range);
    return [errors, grafanaExploreLink({ label: `Grafana: ${target.service} calls per second`, expr: queries.total }, range)];
  });
  return [...spanLinks, grafanaExploreLink({ label: 'Grafana: recommendations canary', expr: canaryQuery(minutes) }, range)];
}

export async function readFailureRate(query: { minutes: number }): Promise<Reading> {
  const spans = await Promise.all(RECOMMENDATION_SPANS.map((target) => spanRate(target, query.minutes)));
  const canary = await prometheusScalar(canaryQuery(query.minutes));
  const spanLines = spans.map(
    (span) => `${span.service} ${span.span}: errors ${percentText(span.errorShare)} of ${span.callsPerSecond ?? 0} calls per second`,
  );
  const facts = failureFactsOf(spans, rateWindowMinutes(query.minutes));
  const source = 'span metrics and canary: recommendation';
  const excerpt = excerptOf([...spanLines, canaryLine(canary)]);
  const data = { ...failureData(facts), spans, canary };
  const reading = { kind: 'logs', source, summary: failureSummary(facts), excerpt, value: failureValue(facts), data } as const;
  return { ...reading, sourceLinks: failureLinks(query.minutes) };
}
