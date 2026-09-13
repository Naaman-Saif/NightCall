import { failureData, failureFactsOf, failureSummary, failureValue, type SpanShare } from './failure-rate-summary';

function spans(frontend: Partial<SpanShare>, backend: Partial<SpanShare>): SpanShare[] {
  return [
    { service: 'recommendation', errorShare: 0, callsPerSecond: 0.8, ...backend },
    { service: 'frontend', errorShare: 0, callsPerSecond: 0.83, ...frontend },
  ];
}

describe('failure rate summary', () => {
  it('leads with the frontend route shoppers hit, then the backend span', () => {
    const facts = failureFactsOf(spans({ errorShare: 0.0271 }, { errorShare: 0 }), 10);
    expect(failureSummary(facts)).toBe(
      'Recommendation requests failing: frontend GET /api/recommendations 2.71% of 0.83 requests per second, backend ListRecommendations 0.00%, over the last 10 minutes',
    );
    expect(failureValue(facts)).toBe('frontend 2.71%, backend 0.00% over 10 min');
    expect(failureData(facts)).toEqual({ frontendErrorShare: 0.0271, backendErrorShare: 0, callsPerSecond: 0.83 });
  });

  it('says no requests failed only when both shares are zero', () => {
    const quiet = failureFactsOf(spans({}, {}), 10);
    expect(failureSummary(quiet)).toMatch(/^No recommendation requests failed over the last 10 minutes \(frontend .* 0\.00% of 0\.83 requests per second, backend ListRecommendations 0\.00%\)$/);
    const backendOnly = failureFactsOf(spans({}, { errorShare: 0.5 }), 10);
    expect(failureSummary(backendOnly).startsWith('Recommendation requests failing:')).toBe(true);
    const noTraffic = failureFactsOf(spans({ errorShare: null, callsPerSecond: null }, {}), 10);
    expect(failureSummary(noTraffic)).toContain('frontend GET /api/recommendations no traffic of no measured requests');
    expect(failureSummary(noTraffic).startsWith('Recommendation requests failing:')).toBe(true);
  });
});
