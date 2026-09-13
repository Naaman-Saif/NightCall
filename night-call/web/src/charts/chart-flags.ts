import type { IncidentMarker } from '../api/markers';
import { FLAG_ROWS, FLAG_SPACING, xAt, type TimeScale } from './chart-geometry';

export type MarkerLine = { key: number; marker: IncidentMarker; x: number };
export type FlagGroup = { markers: IncidentMarker[]; flagX: number; row: number };

export function markerLinesOf(markers: IncidentMarker[], scale: TimeScale): MarkerLine[] {
  return markers
    .map((marker, key) => ({ key, marker, x: xAt(scale, Date.parse(marker.at)) }))
    .sort((first, second) => first.x - second.x);
}

export function flagGroupsOf(lines: MarkerLine[], width: number): FlagGroup[] {
  const lastXByRow = Array.from({ length: FLAG_ROWS }, () => Number.NEGATIVE_INFINITY);
  const groups: FlagGroup[] = [];
  for (const line of lines) {
    const flagX = Math.max(0, Math.min(line.x, width - FLAG_SPACING));
    const row = lastXByRow.findIndex((lastX) => flagX - lastX >= FLAG_SPACING);
    if (row < 0) {
      groups[groups.length - 1].markers.push(line.marker);
      continue;
    }
    lastXByRow[row] = flagX;
    groups.push({ markers: [line.marker], flagX, row });
  }
  return groups;
}
