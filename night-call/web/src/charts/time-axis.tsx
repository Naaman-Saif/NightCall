import { formatTimeOfDay } from '../format/time';
import { AXIS_TOP, CHART_LEFT, CHART_RIGHT, xAt, type TimeScale } from './chart-geometry';

const NARROW_CHART_WIDTH = 520;

function anchorFor(index: number, count: number): 'start' | 'middle' | 'end' {
  if (index === 0) return 'start';
  return index === count - 1 ? 'end' : 'middle';
}

export function TimeAxis({ scale }: { scale: TimeScale }) {
  const count = scale.width < NARROW_CHART_WIDTH ? 3 : 6;
  const ticks = Array.from({ length: count }, (_, index) => scale.start + ((scale.end - scale.start) * index) / (count - 1));
  return (
    <g>
      <line x1={CHART_LEFT} x2={scale.width - CHART_RIGHT} y1={AXIS_TOP} y2={AXIS_TOP} stroke="var(--line)" strokeWidth={1} />
      {ticks.map((tick, index) => (
        <text key={tick} className="chart-text" x={xAt(scale, tick)} y={AXIS_TOP + 16} textAnchor={anchorFor(index, count)}>
          {formatTimeOfDay(new Date(tick).toISOString()).slice(0, 5)}
        </text>
      ))}
    </g>
  );
}
