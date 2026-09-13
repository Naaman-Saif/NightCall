import type { SeriesSample } from './series-sample';

export type SeriesPoint = { at: string; memoryBytes: number | null; cpuPercent: number | null };

export type SeriesReply = { service: string; limitBytes: number | null; samples: SeriesPoint[] };

export type SeriesWindow = { service: string; samples: SeriesSample[]; minutes: number };

function latestLimit(samples: SeriesSample[]): number | null {
  return [...samples].reverse().find((sample) => sample.limitBytes !== null)?.limitBytes ?? null;
}

export function seriesReply(window: SeriesWindow): SeriesReply {
  const lastAt = window.samples.at(-1)?.at;
  const cutoff = lastAt ? Date.parse(lastAt) - window.minutes * 60_000 : 0;
  const kept = window.samples.filter((sample) => Date.parse(sample.at) >= cutoff);
  const samples = kept.map(({ at, memoryBytes, cpuPercent }) => ({ at, memoryBytes, cpuPercent }));
  return { service: window.service, limitBytes: latestLimit(kept), samples };
}
