import { useMemo } from 'react';
import type { IncidentMarker } from '../api/markers';
import type { Series } from '../api/series';
import { PLOT_HEIGHT, type TimeScale } from './chart-geometry';
import { Crosshair, ChartReadout } from './chart-readout';
import { chartViewOf, type ChartView } from './chart-view';
import { MarkerFlags, MarkerLines } from './marker-layer';
import { MetricPlot } from './metric-plot';
import { TimeAxis } from './time-axis';
import { useChartFocus, type ChartFocusState } from './use-chart-focus';
import { useElementWidth } from './use-element-width';

type ChartSource = { series: Series; markers: IncidentMarker[] };
type ChartBodyProps = ChartSource & { view: ChartView; scale: TimeScale; focus: ChartFocusState };

const PLOT_LABEL = 'Memory and CPU over time. Move the pointer, tap, or use the left and right arrow keys to read exact values.';

export function WhatHappenedChart({ series, markers }: ChartSource) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const view = useMemo(() => chartViewOf({ series, markers, width }), [series, markers, width]);
  const focus = useChartFocus({ sampleTimes: view.sampleTimes, scale: view.scale });
  return (
    <div ref={ref} className="what-happened-chart">
      {view.scale && <ChartBody series={series} markers={markers} view={view} scale={view.scale} focus={focus} />}
    </div>
  );
}

function ChartBody({ series, markers, view, scale, focus }: ChartBodyProps) {
  return (
    <>
      <MarkerFlags placements={view.placements} width={scale.width} onFocusMarker={focus.focusMarker} />
      <div className="chart-plot" tabIndex={0} role="group" aria-label={PLOT_LABEL} {...focus.plotHandlers}>
        <svg width={scale.width} height={PLOT_HEIGHT} className="chart-svg" aria-hidden>
          <MarkerLines placements={view.placements} alarmX={view.alarmX} />
          {view.panels.map((panel) => (
            <MetricPlot key={panel.key} panel={panel} width={scale.width} />
          ))}
          <TimeAxis scale={scale} />
          <Crosshair focus={focus.focus} panels={view.panels} />
        </svg>
      </div>
      <ChartReadout focus={focus.focus} series={series} markers={markers} scale={scale} />
    </>
  );
}
