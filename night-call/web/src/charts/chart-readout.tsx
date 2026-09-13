import type { IncidentMarker } from '../api/markers';
import type { Series, SeriesSample } from '../api/series';
import { hasSandboxOnlyMarker } from '../format/marker-text';
import { formatClock } from '../format/time';
import type { FlagGroup } from './chart-flags';
import { FLAG_ROWS, FLAG_ROW_HEIGHT, READOUT_WIDTH, xAt, type TimeScale } from './chart-geometry';
import type { ChartFocus } from './use-chart-focus';

type ReadoutProps = { focus: ChartFocus; series: Series; groups: FlagGroup[]; scale: TimeScale };

const NOTHING_DEPLOYED = 'Nothing was deployed, so the live line is unchanged.';

function formatMemory(bytes: number | null): string {
  return bytes === null ? 'no reading' : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatCpu(percent: number | null): string {
  return percent === null ? 'no reading' : `${percent.toFixed(1)} %`;
}

function anchorX({ focus, series, groups, scale }: ReadoutProps): number | null {
  if (focus?.kind === 'sample') {
    const sample = series.samples[focus.index];
    return sample ? xAt(scale, Date.parse(sample.at)) : null;
  }
  return focus ? (groups[focus.index]?.flagX ?? null) : null;
}

export function ChartReadout(props: ReadoutProps) {
  const x = anchorX(props);
  if (!props.focus || x === null) return null;
  const left = Math.min(Math.max(0, x + 12), Math.max(0, props.scale.width - READOUT_WIDTH));
  const top = FLAG_ROWS * FLAG_ROW_HEIGHT + 8;
  return (
    <div className="chart-readout" role="status" data-focus={props.focus.kind} style={{ left, top }}>
      {props.focus.kind === 'sample' ? (
        <SampleReadout sample={props.series.samples[props.focus.index]} />
      ) : (
        <GroupReadout markers={props.groups[props.focus.index].markers} />
      )}
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

function GroupReadout({ markers }: { markers: IncidentMarker[] }) {
  return (
    <>
      {markers.map((marker) => (
        <div key={`${marker.kind}-${marker.at}`} className="readout-marker">
          <div className="readout-value">{marker.label}</div>
          <div className="readout-time">{formatClock(marker.at)}</div>
        </div>
      ))}
      {hasSandboxOnlyMarker(markers) && <div className="readout-note">{NOTHING_DEPLOYED}</div>}
    </>
  );
}
