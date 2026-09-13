import { cpuPercent, cpuReadingOf, isRunningReading } from '../sandbox-copy/cpu-percent';
import { memoryInUse } from './memory-usage';
import type { ProductionContainer, ProductionSource, SeriesSample } from './series-sample';
import type { ServiceTrack } from './service-tracks';

export type SampleTarget = { container: ProductionContainer; track: ServiceTrack };

export async function recordSample(source: ProductionSource, target: SampleTarget): Promise<SeriesSample> {
  const { stats, limitBytes } = await source.read(target.container);
  const current = cpuReadingOf(stats);
  const cpu = cpuPercent({ previous: target.track.previousCpu, current });
  if (isRunningReading(current)) target.track.previousCpu = current;
  const at = new Date().toISOString();
  const sample = { at, service: target.container.service, memoryBytes: memoryInUse(stats), limitBytes, cpuPercent: cpu };
  target.track.samples.push(sample);
  return sample;
}
