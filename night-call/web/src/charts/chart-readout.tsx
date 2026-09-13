import type { IncidentMarker } from '../api/markers';
import type { Series, SeriesSample } from '../api/series';
import { markerNote } from '../format/marker-text';
import { formatClock } from '../format/time';
import { AXIS_TOP, FLAG_ROWS, FLAG_ROW_HEIGHT, READOUT_WIDTH, xAt, type TimeScale } from './chart-geometry';
import type { PanelView } from './chart-panels';
import type { ChartFocus } from './use-chart-focus';

type ReadoutProps = { focus: ChartFocus; series: Series; markers: IncidentMarker[]; scale: TimeScale };

function formatMemory(bytes: number | null): string {
  return bytes === null ? 'no reading' : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatCpu(percent: number | null): string {
  return percent === null ? 'no reading' : `${percent.toFixed(1)} %`;
}

export function ChartReadout({ focus, series, markers, scale }: ReadoutProps) {
  const at = focus?.kind === 'sample' ? series.samples[focus.index]?.at : focus ? markers[focus.index]?.at : undefined;
  if (!focus || !at) return null;
  const left = Math.min(Math.max(0, xAt(scale, Date.parse(at)) + 12), Math.max(0, scale.width - READOUT_WIDTH));
  const top = FLAG_ROWS * FLAG_ROW_HEIGHT + 8;
  return (
    <div className="chart-readout" role="status" data-focus={focus.kind} style={{ left, top }}>
      {focus.kind === 'sample' ? <SampleReadout sample={series.samples[focus.index]} /> : <MarkerReadout marker={markers[focus.index]} />}
    </div>
  );
}

function SampleReadout({ sample }: { sample: SeriesSample }) {
  return (
    <>
      <ReadoutRow value={formatMemory(sample.memoryBytes)} label="memory" />
      <ReadoutRow value={formatCpu(sample.cpuPercent)} label="CPU" series="cpu" />
      <div className="readout-time">{formatClock(sample.at)}</div>
    </>
  );
}

function ReadoutRow({ value, label, series = 'memory' }: { value: string; label: string; series?: string }) {
  return (
    <div className="readout-row">
      <span className="line-key" data-series={series} aria-hidden />
      <span className="readout-value">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function MarkerReadout({ marker }: { marker: IncidentMarker }) {
  const note = markerNote(marker.kind);
  return (
    <>
      <div className="readout-value">{marker.label}</div>
      <div className="readout-time">{formatClock(marker.at)}</div>
      {note && <div className="readout-note">{note}</div>}
    </>
  );
}

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
