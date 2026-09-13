import { resolve } from 'node:path';

import type { Experiment } from '../investigation/proof-snapshot';
import { readJsonLines } from '../recorder/series-files';
import type { SeriesSample } from '../recorder/series-sample';
import { isInside } from '../sandbox-copy/run-files';

export type ExperimentSeriesRequest = { folder: string; experiment: Experiment | undefined };

export function experimentSamples(request: ExperimentSeriesRequest): SeriesSample[] {
  const reference = request.experiment?.seriesRef;
  if (!reference) return [];
  const path = resolve(request.folder, reference);
  if (!isInside(path, resolve(request.folder))) return [];
  return readJsonLines<SeriesSample>(path);
}
