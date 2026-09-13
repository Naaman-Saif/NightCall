import * as React from 'react';

export interface MetricPoint { x: string; y: number }

export interface MetricChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Ordered points; x is a display label (elapsed time or request count). */
  series: MetricPoint[];
  /** Configured limit — drawn as a dashed red line. Always show it when one exists. */
  limit?: number;
  limitLabel?: string;
  unit?: string;
  height?: number;
  /** Axis caption, e.g. "elapsed / requests". */
  xLabel?: string;
  yMax?: number;
  color?: string;
  /** Shows the Illustrative-demo-data badge. Default true. */
  demo?: boolean;
}
export declare function MetricChart(props: MetricChartProps): JSX.Element;
