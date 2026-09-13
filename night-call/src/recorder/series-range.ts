import type { SeriesSample } from './series-sample';

export type SampleRange = { fromMs: number; toMs: number };

export function samplesWithin(samples: SeriesSample[], range: SampleRange): SeriesSample[] {
  return samples.filter((sample) => {
    const at = Date.parse(sample.at);
    return at >= range.fromMs && at <= range.toMs;
  });
}

export function rangeMinutes(range: SampleRange): number {
  return Math.max(1, Math.ceil((range.toMs - range.fromMs) / 60_000));
}
