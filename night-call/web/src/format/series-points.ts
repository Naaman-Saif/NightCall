import type { SeriesSample } from '../api/series';
import type { MetricPoint } from '../kit';
import { formatTimeOfDay } from './time';

const BYTES_PER_MIB = 1024 * 1024;

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

export function bytesToMib(bytes: number): number {
  return roundToTenth(bytes / BYTES_PER_MIB);
}

export function memoryPoints(samples: SeriesSample[]): MetricPoint[] {
  return samples.flatMap((sample) =>
    sample.memoryBytes === null ? [] : [{ x: formatTimeOfDay(sample.at), y: bytesToMib(sample.memoryBytes) }],
  );
}

export function cpuPoints(samples: SeriesSample[]): MetricPoint[] {
  return samples.flatMap((sample) =>
    sample.cpuPercent === null ? [] : [{ x: formatTimeOfDay(sample.at), y: roundToTenth(sample.cpuPercent) }],
  );
}
