import { useEffect, useState } from 'react';
import { readJson } from './client';
import type { Experiment } from './contract';
import type { Series } from './series';

export const REFRESH_EXPERIMENT_SERIES_EVERY_MS = 10_000;

type SeriesTarget = { incidentId: string; experimentId: string };

async function fetchExperimentSeries({ incidentId, experimentId }: SeriesTarget): Promise<Series> {
  const path = `/api/incidents/${encodeURIComponent(incidentId)}/experiments/${encodeURIComponent(experimentId)}/series`;
  return readJson(await fetch(path));
}

export function useExperimentSeries(incidentId: string, experiment: Experiment): Series | null {
  const [series, setSeries] = useState<Series | null>(null);
  const experimentId = experiment.id;
  const isRunning = !experiment.finishedAt;
  useEffect(() => {
    const read = () => fetchExperimentSeries({ incidentId, experimentId }).then(setSeries, () => undefined);
    read();
    if (!isRunning) return undefined;
    const timer = window.setInterval(read, REFRESH_EXPERIMENT_SERIES_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [incidentId, experimentId, isRunning]);
  return series;
}
