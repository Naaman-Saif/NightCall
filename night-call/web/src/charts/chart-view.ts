import type { IncidentMarker } from '../api/markers';
import type { Series } from '../api/series';
import { FLAG_ROWS, FLAG_SPACING, timeScaleOf, xAt, type TimeScale } from './chart-geometry';
import { cpuPanel, memoryPanel, type PanelView } from './chart-panels';

export type FlagPlacement = { marker: IncidentMarker; index: number; x: number; row: number };

export type ChartView = {
  scale: TimeScale | null;
  panels: PanelView[];
  placements: FlagPlacement[];
  sampleTimes: number[];
  alarmX: number | null;
};

type ChartInput = { series: Series; markers: IncidentMarker[]; width: number };

function pickRow(lastXByRow: number[], x: number): number {
  const freeRow = lastXByRow.findIndex((lastX) => x - lastX >= FLAG_SPACING);
  if (freeRow >= 0) return freeRow;
  return lastXByRow.indexOf(Math.min(...lastXByRow));
}

export function flagPlacements(markers: IncidentMarker[], scale: TimeScale): FlagPlacement[] {
  const lastXByRow = Array.from({ length: FLAG_ROWS }, () => Number.NEGATIVE_INFINITY);
  const byTime = markers
    .map((marker, index) => ({ marker, index, x: xAt(scale, Date.parse(marker.at)) }))
    .sort((first, second) => first.x - second.x);
  return byTime.map((placement) => {
    const row = pickRow(lastXByRow, placement.x);
    lastXByRow[row] = placement.x;
    return { ...placement, row };
  });
}

export function chartViewOf({ series, markers, width }: ChartInput): ChartView {
  const sampleTimes = series.samples.map((sample) => Date.parse(sample.at));
  const scale = timeScaleOf([...sampleTimes, ...markers.map((marker) => Date.parse(marker.at))], width);
  if (!scale) return { scale, panels: [], placements: [], sampleTimes, alarmX: null };
  const alarm = markers.find((marker) => marker.kind === 'alarm');
  const alarmX = alarm ? xAt(scale, Date.parse(alarm.at)) : null;
  const panels = [memoryPanel(series, scale), cpuPanel(series, scale)];
  return { scale, panels, placements: flagPlacements(markers, scale), sampleTimes, alarmX };
}
