import type { PointerEvent } from 'react';
import { formatClock } from '../format/time';
import { markerLookOf } from '../format/marker-text';
import { AXIS_TOP, CHART_LEFT, FLAG_ROWS, FLAG_ROW_HEIGHT, FLAG_SPACING } from './chart-geometry';
import type { FlagPlacement } from './chart-view';

type FocusMarker = (index: number | null) => void;
type FlagProps = { placement: FlagPlacement; isNearRightEdge: boolean; onFocusMarker: FocusMarker };
type FlagsProps = { placements: FlagPlacement[]; width: number; onFocusMarker: FocusMarker };

export function MarkerLines({ placements, alarmX }: { placements: FlagPlacement[]; alarmX: number | null }) {
  return (
    <g>
      {alarmX !== null && (
        <rect data-before-alarm x={CHART_LEFT} y={0} width={Math.max(0, alarmX - CHART_LEFT)} height={AXIS_TOP} fill="var(--surface-raised)" />
      )}
      {placements.map((placement) => (
        <line key={placement.index} data-marker={placement.marker.kind} x1={placement.x} x2={placement.x} y1={0} y2={AXIS_TOP}
          stroke={markerLookOf(placement.marker.kind).color} strokeWidth={1.5} />
      ))}
    </g>
  );
}

export function MarkerFlags({ placements, width, onFocusMarker }: FlagsProps) {
  return (
    <div className="marker-band" style={{ height: FLAG_ROWS * FLAG_ROW_HEIGHT }}>
      {placements.map((placement) => (
        <MarkerFlag key={placement.index} placement={placement} isNearRightEdge={placement.x > width - FLAG_SPACING} onFocusMarker={onFocusMarker} />
      ))}
    </div>
  );
}

function MarkerFlag({ placement, isNearRightEdge, onFocusMarker }: FlagProps) {
  const { marker } = placement;
  const look = markerLookOf(marker.kind);
  const show = () => onFocusMarker(placement.index);
  const hideForMouse = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') onFocusMarker(null);
  };
  return (
    <button type="button" className="marker-flag" data-kind={marker.kind} data-edge={isNearRightEdge ? 'right' : 'left'}
      style={{ left: placement.x, top: placement.row * FLAG_ROW_HEIGHT, borderColor: look.color }}
      aria-label={`${marker.label}, ${formatClock(marker.at)}`}
      onPointerEnter={show} onFocus={show} onClick={show} onPointerLeave={hideForMouse} onBlur={() => onFocusMarker(null)}>
      {look.short}
    </button>
  );
}
