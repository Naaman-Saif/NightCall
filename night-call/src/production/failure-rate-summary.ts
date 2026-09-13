import { percentText } from './failure-rate-query';

export type SpanShare = { service: string; errorShare: number | null; callsPerSecond: number | null };

export type FailureFacts = { frontend: SpanShare | null; backend: SpanShare | null; windowMinutes: number };

function rateText(callsPerSecond: number | null): string {
  return callsPerSecond === null ? 'no measured requests' : `${callsPerSecond.toFixed(2)} requests per second`;
}

export function failureFactsOf(spans: SpanShare[], windowMinutes: number): FailureFacts {
  const frontend = spans.find((span) => span.service === 'frontend') ?? null;
  const backend = spans.find((span) => span.service === 'recommendation') ?? null;
  return { frontend, backend, windowMinutes };
}

function detailOf(facts: FailureFacts): string {
  const frontend = `frontend GET /api/recommendations ${percentText(facts.frontend?.errorShare ?? null)} of ${rateText(facts.frontend?.callsPerSecond ?? null)}`;
  return `${frontend}, backend ListRecommendations ${percentText(facts.backend?.errorShare ?? null)}`;
}

export function failureSummary(facts: FailureFacts): string {
  const noneFailed = facts.frontend?.errorShare === 0 && facts.backend?.errorShare === 0;
  if (noneFailed) return `No recommendation requests failed over the last ${facts.windowMinutes} minutes (${detailOf(facts)})`;
  return `Recommendation requests failing: ${detailOf(facts)}, over the last ${facts.windowMinutes} minutes`;
}

export function failureValue(facts: FailureFacts): string {
  const shares = `frontend ${percentText(facts.frontend?.errorShare ?? null)}, backend ${percentText(facts.backend?.errorShare ?? null)}`;
  return `${shares} over ${facts.windowMinutes} min`;
}

export function failureData(facts: FailureFacts) {
  const frontendErrorShare = facts.frontend?.errorShare ?? null;
  return { frontendErrorShare, backendErrorShare: facts.backend?.errorShare ?? null, callsPerSecond: facts.frontend?.callsPerSecond ?? null };
}
