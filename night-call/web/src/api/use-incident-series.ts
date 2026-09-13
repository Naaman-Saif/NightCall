import { useEffect, useState } from 'react';
import type { Incident } from './contract';
import { fetchSeries, type Series } from './series';

export type SeriesStatus = 'sample' | 'loading' | 'unavailable' | 'ready';
export type SeriesState = { status: SeriesStatus; series: Series | null };

export const REFRESH_SERIES_EVERY_MS = 10_000;

type SeriesTarget = { incident: Incident; isSample: boolean };

export function useIncidentSeries({ incident, isSample }: SeriesTarget): SeriesState {
  const [state, setState] = useState<SeriesState>({ status: isSample ? 'sample' : 'loading', series: null });
  const isActive = incident.lifecycle === 'active';
  useEffect(() => {
    if (isSample) return undefined;
    const keepLastSeries = (current: SeriesState) => (current.series ? current : { status: 'unavailable' as const, series: null });
    const readSeries = () =>
      fetchSeries(incident.id, incident.service).then(
        (series) => setState({ status: 'ready', series }),
        () => setState(keepLastSeries),
      );
    readSeries();
    if (!isActive) return undefined;
    const timer = window.setInterval(readSeries, REFRESH_SERIES_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [incident.id, incident.service, isActive, isSample]);
  return state;
}
