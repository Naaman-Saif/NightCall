const TRAFFIC_WORDS: Record<string, string> = {
  traces: "the incident's real traffic",
  prometheus_rate_fallback: "the incident's measured request rate",
  fixed_fallback: 'fixed test traffic',
};

export function trafficWords(source: string | null): string {
  return TRAFFIC_WORDS[source ?? ''] ?? 'test traffic';
}

export function speedWords(speed: number | null | undefined): string {
  return speed && speed !== 1 ? `, replayed at ${speed}x speed` : '';
}
