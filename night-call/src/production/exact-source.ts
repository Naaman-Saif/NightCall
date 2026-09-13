import type { SourceLink, TimeRange } from './source-links';

export type ExactSource = { kind: 'recorder'; service: string; range: TimeRange } | { kind: 'stored_excerpt' };

export type RecordedIds = { incidentId: string; evidenceId: string };

export const RECORDER_LINK_LABEL = 'NightCall recorder data';
export const EXCERPT_LINK_LABEL = 'NightCall stored excerpt';
export const COMPARE_LINK_LABEL = 'Compare in Grafana (separate measurement)';

export function exactLink(source: ExactSource, ids: RecordedIds): SourceLink {
  const incidentPath = `/api/incidents/${encodeURIComponent(ids.incidentId)}`;
  if (source.kind === 'stored_excerpt') {
    return { label: EXCERPT_LINK_LABEL, url: `${incidentPath}/evidence/${encodeURIComponent(ids.evidenceId)}` };
  }
  const query = new URLSearchParams({ service: source.service, from: String(source.range.fromMs), to: String(source.range.toMs) });
  return { label: RECORDER_LINK_LABEL, url: `${incidentPath}/series?${query.toString()}` };
}
