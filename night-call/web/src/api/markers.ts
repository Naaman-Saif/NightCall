import { readJson } from './client';

export type MarkerKind = 'config_change' | 'crash' | 'restart' | 'alarm' | 'operator_answer' | 'fix_verified' | 'pr_opened';

export type IncidentMarker = { at: string; kind: MarkerKind; label: string; ref: string | null };

export async function fetchMarkers(incidentId: string): Promise<IncidentMarker[]> {
  return readJson(await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/markers`));
}
