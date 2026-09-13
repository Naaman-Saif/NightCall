import type { TrafficSource } from '../api/contract';

export type TrafficFacts = { trafficSource?: TrafficSource | null; speed?: number | null };

const TRAFFIC_SOURCE_TEXT: Record<TrafficSource, string> = {
  traces: "Replayed the incident's real traffic",
  prometheus_rate_fallback: "Replayed the incident's request rate (request details missing)",
  fixed_fallback: 'Fixed test load (real traffic missing)',
};

const NORMAL_SPEED = 1;

function speedSuffix(speed: number | null | undefined): string {
  if (typeof speed !== 'number' || speed === NORMAL_SPEED) return '';
  return ` at ${speed}x speed`;
}

export function describeTraffic({ trafficSource, speed }: TrafficFacts): string | null {
  if (!trafficSource) return null;
  const source = TRAFFIC_SOURCE_TEXT[trafficSource];
  return source ? `${source}${speedSuffix(speed)}` : null;
}
