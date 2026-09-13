export type PlotPoint = { x: number; y: number | null };

type DrawnPoint = { x: number; y: number };

function segmentsOf(points: PlotPoint[]): DrawnPoint[][] {
  const segments: DrawnPoint[][] = [[]];
  for (const point of points) {
    if (point.y === null) segments.push([]);
    else segments[segments.length - 1].push({ x: point.x, y: point.y });
  }
  return segments.filter((segment) => segment.length > 0);
}

function strokeOf(segment: DrawnPoint[]): string {
  return segment.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
}

export function linePath(points: PlotPoint[]): string {
  return segmentsOf(points).map(strokeOf).join(' ');
}

export function areaPath(points: PlotPoint[], baseline: number): string {
  return segmentsOf(points)
    .map((segment) => {
      const first = segment[0];
      const last = segment[segment.length - 1];
      return `${strokeOf(segment)} L${last.x.toFixed(1)} ${baseline} L${first.x.toFixed(1)} ${baseline} Z`;
    })
    .join(' ');
}
