import { readJson } from './client';

export const SERIES_MINUTES = 30;

export type SeriesSample = { at: string; memoryBytes: number | null; cpuPercent: number | null };
export type Series = { service: string; limitBytes: number | null; samples: SeriesSample[] };

export async function fetchSeries(incidentId: string, service: string): Promise<Series> {
  const query = new URLSearchParams({ service, minutes: String(SERIES_MINUTES) });
  return readJson(await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/series?${query}`));
}
