import { useEffect, useState } from 'react';
import { fetchMarkers, type IncidentMarker } from './markers';
import { fetchSeries, type Series } from './series';

export const REFRESH_CHART_EVERY_MS = 10_000;

export type ChartData = { series: Series | null; markers: IncidentMarker[]; isLoading: boolean; isMarkersAvailable: boolean };

type ChartTarget = { incidentId: string; service: string; isActive: boolean };

const LOADING: ChartData = { series: null, markers: [], isLoading: true, isMarkersAvailable: false };

async function readChartData(target: ChartTarget): Promise<ChartData> {
  const [series, markers] = await Promise.all([
    fetchSeries(target.incidentId, target.service).catch(() => null),
    fetchMarkers(target.incidentId).catch(() => null),
  ]);
  return { series, markers: markers ?? [], isLoading: false, isMarkersAvailable: markers !== null };
}

function keepKnownData(current: ChartData, next: ChartData): ChartData {
  const markers = next.isMarkersAvailable ? next.markers : current.markers;
  const isMarkersAvailable = next.isMarkersAvailable || current.isMarkersAvailable;
  return { series: next.series ?? current.series, markers, isLoading: false, isMarkersAvailable };
}

export function useLiveChartData({ incidentId, service, isActive }: ChartTarget): ChartData {
  const [data, setData] = useState<ChartData>(LOADING);
  useEffect(() => {
    const read = () =>
      readChartData({ incidentId, service, isActive }).then((next) => setData((current) => keepKnownData(current, next)));
    read();
    if (!isActive) return undefined;
    const timer = window.setInterval(read, REFRESH_CHART_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [incidentId, service, isActive]);
  return data;
}
