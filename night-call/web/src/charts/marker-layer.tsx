import type { PointerEvent } from 'react';
import { formatClock } from '../format/time';
import { markerLookOf } from '../format/marker-text';
import type { FlagGroup, MarkerLine } from './chart-flags';
import { AXIS_TOP, CHART_LEFT, FLAG_ROWS, FLAG_ROW_HEIGHT } from './chart-geometry';

type FocusMarker = (index: number | null) => void;
type FlagProps = { group: FlagGroup; index: number; onFocusMarker: FocusMarker };
type FlagsProps = { groups: FlagGroup[]; onFocusMarker: FocusMarker };

export function MarkerLines({ lines, alarmX }: { lines: MarkerLine[]; alarmX: number | null }) {
  return (
    <g>
      {alarmX !== null && (
        <rect data-before-alarm x={CHART_LEFT} y={0} width={Math.max(0, alarmX - CHART_LEFT)} height={AXIS_TOP} fill="var(--surface-raised)" />
      )}
      {lines.map((line) => (
        <line key={line.key} data-marker={line.marker.kind} data-at={line.marker.at} x1={line.x} x2={line.x} y1={0} y2={AXIS_TOP}
          stroke={markerLookOf(line.marker.kind).color} strokeWidth={1.5} />
      ))}
    </g>
  );
}

export function MarkerFlags({ groups, onFocusMarker }: FlagsProps) {
  return (
    <div className="marker-band" style={{ height: FLAG_ROWS * FLAG_ROW_HEIGHT }}>
      {groups.map((group, index) => (
        <MarkerFlag key={group.markers[0].at + index} group={group} index={index} onFocusMarker={onFocusMarker} />
      ))}
    </div>
  );
}

function flagText(group: FlagGroup): string {
  const short = markerLookOf(group.markers[0].kind).short;
  return group.markers.length > 1 ? `${short} +${group.markers.length - 1}` : short;
}

function MarkerFlag({ group, index, onFocusMarker }: FlagProps) {
  const first = group.markers[0];
  const show = () => onFocusMarker(index);
  const hideForMouse = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') onFocusMarker(null);
  };
  const label = group.markers.map((marker) => `${marker.label}, ${formatClock(marker.at)}`).join('; ');
  return (
    <button type="button" className="marker-flag" data-kind={first.kind} data-count={group.markers.length} aria-label={label}
      style={{ left: group.flagX, top: group.row * FLAG_ROW_HEIGHT, borderLeftColor: markerLookOf(first.kind).color }}
      onPointerEnter={show} onFocus={show} onClick={show} onPointerLeave={hideForMouse} onBlur={() => onFocusMarker(null)}>
      {flagText(group)}
    </button>
  );
}
