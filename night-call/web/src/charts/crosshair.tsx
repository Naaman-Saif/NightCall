import { AXIS_TOP } from './chart-geometry';
import type { PanelView } from './chart-panels';
import type { ChartFocus } from './use-chart-focus';

export function Crosshair({ focus, panels }: { focus: ChartFocus; panels: PanelView[] }) {
  if (focus?.kind !== 'sample') return null;
  const x = panels[0]?.points[focus.index]?.x;
  if (x === undefined) return null;
  return (
    <g data-crosshair>
      <line x1={x} x2={x} y1={0} y2={AXIS_TOP} stroke="var(--text-muted)" strokeWidth={1} />
      {panels.map((panel) => {
        const y = panel.points[focus.index]?.y;
        return y === null || y === undefined ? null : (
          <circle key={panel.key} cx={x} cy={y} r={4} fill={panel.color} stroke="var(--surface-card)" strokeWidth={2} />
        );
      })}
    </g>
  );
}
