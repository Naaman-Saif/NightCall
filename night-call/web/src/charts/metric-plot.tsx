import { CHART_LEFT, CHART_RIGHT, yAt } from './chart-geometry';
import type { PanelView } from './chart-panels';
import { areaPath, linePath } from './chart-paths';

type RuleProps = { y: number; right: number; label: string };


function formatTick(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function MetricPlot({ panel, width }: { panel: PanelView; width: number }) {
  const baseline = panel.scale.top + panel.scale.height;
  const right = width - CHART_RIGHT;
  const ticks = [0, panel.scale.max / 2, panel.scale.max];
  return (
    <g data-panel={panel.key}>
      <text className="chart-title" x={CHART_LEFT} y={panel.scale.top - 10}>{panel.title}</text>
      {ticks.map((tick) => (
        <GridRule key={tick} y={yAt(panel.scale, tick)} right={right} label={formatTick(tick)} />
      ))}
      <path d={areaPath(panel.points, baseline)} fill={panel.color} fillOpacity={0.1} />
      <path d={linePath(panel.points)} fill="none" stroke={panel.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {panel.limit !== null && <LimitRule y={yAt(panel.scale, panel.limit)} right={right} label={`${formatTick(panel.limit)} MiB limit`} />}
    </g>
  );
}

function GridRule({ y, right, label }: RuleProps) {
  return (
    <g>
      <line x1={CHART_LEFT} x2={right} y1={y} y2={y} stroke="var(--line-soft)" strokeWidth={1} />
      <text className="chart-text" x={CHART_LEFT - 8} y={y + 4} textAnchor="end">{label}</text>
    </g>
  );
}

function LimitRule({ y, right, label }: RuleProps) {
  return (
    <g data-limit>
      <line x1={CHART_LEFT} x2={right} y1={y} y2={y} stroke="var(--critical-400)" strokeWidth={1} strokeDasharray="4 3" />
      <text className="chart-text" x={CHART_LEFT + 8} y={y - 6}>{label}</text>
    </g>
  );
}

