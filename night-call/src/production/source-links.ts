import { settings } from '../config/settings';

export type SourceLink = { label: string; url: string };

export type TimeRange = { fromMs: number; toMs: number };

export type PrometheusQuery = { label: string; expr: string };

export type TraceSearch = { service: string; range: TimeRange; errorsOnly: boolean; operation?: string };

export const GRAFANA_PROMETHEUS_UID = 'webstore-metrics';

export function rangeOfMinutes(minutes: number): TimeRange {
  const toMs = Date.now();
  return { fromMs: toMs - minutes * 60_000, toMs };
}

export function grafanaExploreLink(query: PrometheusQuery, range: TimeRange): SourceLink {
  const datasource = { type: 'prometheus', uid: GRAFANA_PROMETHEUS_UID };
  const pane = {
    datasource: GRAFANA_PROMETHEUS_UID,
    queries: [{ refId: 'A', expr: query.expr, datasource }],
    range: { from: String(range.fromMs), to: String(range.toMs) },
  };
  const panes = encodeURIComponent(JSON.stringify({ nightcall: pane }));
  return { label: query.label, url: `${settings.grafanaBaseUrl}/explore?schemaVersion=1&orgId=1&panes=${panes}` };
}

export function jaegerSearchLink(search: TraceSearch): SourceLink {
  const start = String(search.range.fromMs * 1000);
  const end = String(search.range.toMs * 1000);
  const params = new URLSearchParams({ service: search.service, start, end, limit: '20' });
  if (search.errorsOnly) params.set('tags', JSON.stringify({ error: 'true' }));
  if (search.operation) params.set('operation', search.operation);
  return { label: `Jaeger: ${search.service} traces`, url: `${settings.jaegerBaseUrl}/search?${params.toString()}` };
}

export function jaegerTraceLink(traceId: string): SourceLink {
  return { label: `Jaeger: trace ${traceId.slice(0, 8)}`, url: `${settings.jaegerBaseUrl}/trace/${traceId}` };
}
