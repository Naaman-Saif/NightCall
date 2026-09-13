import type { IncidentMarker } from '../api/markers';
import type { Series } from '../api/series';
import { flagGroupsOf, markerLinesOf, type FlagGroup, type MarkerLine } from './chart-flags';
import { timeScaleOf, xAt, type TimeScale } from './chart-geometry';
import { cpuPanel, memoryPanel, type PanelView } from './chart-panels';

export type ChartView = {
  scale: TimeScale | null;
  panels: PanelView[];
  lines: MarkerLine[];
  groups: FlagGroup[];
  sampleTimes: number[];
  alarmX: number | null;
};

type ChartInput = { series: Series; markers: IncidentMarker[]; width: number };

export function chartViewOf({ series, markers, width }: ChartInput): ChartView {
  const sampleTimes = series.samples.map((sample) => Date.parse(sample.at));
  const scale = timeScaleOf([...sampleTimes, ...markers.map((marker) => Date.parse(marker.at))], width);
  if (!scale) return { scale, panels: [], lines: [], groups: [], sampleTimes, alarmX: null };
  const alarm = markers.find((marker) => marker.kind === 'alarm');
  const alarmX = alarm ? xAt(scale, Date.parse(alarm.at)) : null;
  const panels = [memoryPanel(series, scale), cpuPanel(series, scale)];
  const lines = markerLinesOf(markers, scale);
  return { scale, panels, lines, groups: flagGroupsOf(lines, width), sampleTimes, alarmX };
}
