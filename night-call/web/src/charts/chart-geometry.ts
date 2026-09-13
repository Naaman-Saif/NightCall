export const CHART_LEFT = 52;
export const CHART_RIGHT = 16;
export const MEMORY_TOP = 24;
export const MEMORY_HEIGHT = 128;
export const CPU_TOP = 196;
export const CPU_HEIGHT = 80;
export const AXIS_TOP = 276;
export const PLOT_HEIGHT = 300;
export const FLAG_ROW_HEIGHT = 28;
export const FLAG_ROWS = 3;
export const FLAG_SPACING = 72;
export const READOUT_WIDTH = 240;

const SMALLEST_TIME_SPAN_MS = 60_000;

export type TimeScale = { start: number; end: number; width: number };
export type ValueScale = { max: number; top: number; height: number };

function plotWidthOf(width: number): number {
  return Math.max(1, width - CHART_LEFT - CHART_RIGHT);
}

export function timeScaleOf(times: number[], width: number): TimeScale | null {
  if (times.length === 0 || width <= 0) return null;
  const start = Math.min(...times);
  const end = Math.max(...times, start + SMALLEST_TIME_SPAN_MS);
  return { start, end, width };
}

export function xAt(scale: TimeScale, time: number): number {
  return CHART_LEFT + ((time - scale.start) / (scale.end - scale.start)) * plotWidthOf(scale.width);
}

export function timeAtX(scale: TimeScale, x: number): number {
  return scale.start + ((x - CHART_LEFT) / plotWidthOf(scale.width)) * (scale.end - scale.start);
}

export function yAt(scale: ValueScale, value: number): number {
  return scale.top + scale.height - (Math.min(value, scale.max) / scale.max) * scale.height;
}

export function niceCeiling(value: number, step: number): number {
  return Math.max(step, Math.ceil(value / step) * step);
}

export function nearestIndex(times: number[], time: number): number {
  let best = 0;
  times.forEach((candidate, index) => {
    if (Math.abs(candidate - time) < Math.abs(times[best] - time)) best = index;
  });
  return best;
}
