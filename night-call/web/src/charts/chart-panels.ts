import type { Series, SeriesSample } from '../api/series';
import { CPU_HEIGHT, CPU_TOP, MEMORY_HEIGHT, MEMORY_TOP, niceCeiling, xAt, yAt, type TimeScale, type ValueScale } from './chart-geometry';
import type { PlotPoint } from './chart-paths';

const BYTES_PER_MIB = 1024 * 1024;
const HEADROOM = 1.1;

export type PanelView = { key: 'memory' | 'cpu'; title: string; color: string; scale: ValueScale; points: PlotPoint[]; limit: number | null };

type Reader = (sample: SeriesSample) => number | null;
type Projection = { time: TimeScale; value: ValueScale; read: Reader };

export const readMemoryMib: Reader = (sample) => (sample.memoryBytes === null ? null : sample.memoryBytes / BYTES_PER_MIB);
export const readCpuPercent: Reader = (sample) => sample.cpuPercent;

function pointsFor(samples: SeriesSample[], projection: Projection): PlotPoint[] {
  return samples.map((sample) => {
    const value = projection.read(sample);
    return { x: xAt(projection.time, Date.parse(sample.at)), y: value === null ? null : yAt(projection.value, value) };
  });
}

function highest(samples: SeriesSample[], read: Reader): number {
  return samples.reduce((max, sample) => Math.max(max, read(sample) ?? 0), 0);
}

export function memoryPanel(series: Series, time: TimeScale): PanelView {
  const limit = series.limitBytes === null ? null : series.limitBytes / BYTES_PER_MIB;
  const max = niceCeiling(Math.max(limit ?? 0, highest(series.samples, readMemoryMib)) * HEADROOM, 100);
  const scale = { max, top: MEMORY_TOP, height: MEMORY_HEIGHT };
  const points = pointsFor(series.samples, { time, value: scale, read: readMemoryMib });
  return { key: 'memory', title: 'Memory, MiB', color: 'var(--beacon-500)', scale, points, limit };
}

export function cpuPanel(series: Series, time: TimeScale): PanelView {
  const max = niceCeiling(highest(series.samples, readCpuPercent) * HEADROOM, 25);
  const scale = { max, top: CPU_TOP, height: CPU_HEIGHT };
  const points = pointsFor(series.samples, { time, value: scale, read: readCpuPercent });
  return { key: 'cpu', title: 'CPU, percent', color: 'var(--observed-400)', scale, points, limit: null };
}
