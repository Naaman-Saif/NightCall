export type SpanTarget = { service: string; span: string };

export type SpanRates = { errors: number | null; total: number | null };

export const RECOMMENDATION_SPANS: SpanTarget[] = [
  { service: 'recommendation', span: 'oteldemo.RecommendationService/ListRecommendations' },
  { service: 'frontend', span: 'GET /api/recommendations' },
];

export function rateWindowMinutes(minutes: number): number {
  return Math.max(2, minutes);
}

export function spanQueries(target: SpanTarget, minutes: number): { errors: string; total: string } {
  const selector = `service_name="${target.service}",span_name="${target.span}"`;
  const window = `${rateWindowMinutes(minutes)}m`;
  return {
    errors: `sum(rate(traces_span_metrics_calls_total{${selector},status_code="STATUS_CODE_ERROR"}[${window}])) or vector(0)`,
    total: `sum(rate(traces_span_metrics_calls_total{${selector}}[${window}]))`,
  };
}

export function canaryQuery(minutes: number): string {
  const selector = 'http_url=~".*/api/recommendations.*",http_status_class="2xx"';
  return `avg_over_time(httpcheck_status{${selector}}[${rateWindowMinutes(minutes)}m])`;
}

export function errorShare(rates: SpanRates): number | null {
  if (rates.total === null || rates.total === 0) return null;
  return (rates.errors ?? 0) / rates.total;
}

export function percentText(share: number | null): string {
  return share === null ? 'no traffic' : `${(share * 100).toFixed(2)}%`;
}
