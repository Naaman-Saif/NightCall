import { BadRequestException } from '@nestjs/common';

import { parseContractBody, type ContractCheck } from './contract-catalogue';
import { evaluateChecks } from './evaluate-checks';
import { REPLAY_CAP_MS, cappedRecipe } from './capped-recipe';
import { experimentEndsInTime, explorationMinutesLeft } from './exploration-clock';
import type { TrafficRecipe } from '../production/traffic-recipe-types';

const contract: ContractCheck[] = [
  { name: 'fault.oom_kills', comparator: 'gte', value: 1, unit: 'count' },
  { name: 'fault.http_failures', comparator: 'gte', value: 1, unit: 'count' },
  { name: 'mitigated.http_failures', comparator: 'eq', value: 0, unit: 'count' },
  { name: 'mitigated.restarts', comparator: 'eq', value: 0, unit: 'count' },
  { name: 'mitigated.healthy_requests', comparator: 'gte', value: 400, unit: 'requests' },
  { name: 'mitigated.peak_memory_share', comparator: 'lte', value: 0.8, unit: 'share' },
];

describe('check evaluation', () => {
  it('matches only when every check of the stage passed', () => {
    const fault = evaluateChecks(contract, { stage: 'fault', observations: { 'fault.oom_kills': 1, 'fault.http_failures': 2 } });
    expect(fault).toEqual({ verdict: 'matches', checks: [
      { name: 'fault.oom_kills', passed: true, observed: 1 },
      { name: 'fault.http_failures', passed: true, observed: 2 },
    ] });
    const healthy = { 'mitigated.http_failures': 0, 'mitigated.restarts': 0, 'mitigated.healthy_requests': 400, 'mitigated.peak_memory_share': 0.2 };
    expect(evaluateChecks(contract, { stage: 'mitigated', observations: healthy }).verdict).toBe('matches');
  });

  it('says differs for a failed check and inconclusive for a missing observation', () => {
    const noCrash = evaluateChecks(contract, { stage: 'fault', observations: { 'fault.oom_kills': 0, 'fault.http_failures': 1 } });
    expect(noCrash.verdict).toBe('differs');
    const observations = { 'mitigated.http_failures': 0, 'mitigated.restarts': 0, 'mitigated.healthy_requests': 400, 'mitigated.peak_memory_share': null };
    const missing = evaluateChecks(contract, { stage: 'mitigated', observations });
    expect(missing.verdict).toBe('inconclusive');
    expect(missing.checks.at(-1)).toEqual({ name: 'mitigated.peak_memory_share', passed: false, observed: null });
    expect(evaluateChecks([], { stage: 'fault', observations: {} }).verdict).toBe('inconclusive');
  });
});

describe('contract catalogue', () => {
  it('accepts catalogue checks and stores the catalogue unit', () => {
    const checks = parseContractBody({ checks: [{ name: 'mitigated.healthy_requests', comparator: 'gte', value: 300, unit: 'x' }] });
    expect(checks).toEqual([{ name: 'mitigated.healthy_requests', comparator: 'gte', value: 300, unit: 'requests' }]);
  });

  it('refuses unknown names, wrong comparators, values out of bounds and repeats', () => {
    const bodies = [
      { checks: [{ name: 'fault.latency', comparator: 'gte', value: 1, unit: 'ms' }] },
      { checks: [{ name: 'fault.oom_kills', comparator: 'lte', value: 1, unit: 'count' }] },
      { checks: [{ name: 'mitigated.peak_memory_share', comparator: 'lte', value: 0.95, unit: 'share' }] },
      { checks: [contract[0], contract[0]] },
      { checks: [] },
    ];
    for (const body of bodies) expect(() => parseContractBody(body)).toThrow(BadRequestException);
  });
});

describe('replay window and exploration clock', () => {
  it('keeps only requests due within the cap at the chosen speed', () => {
    const request = (offsetMs: number) => ({ offsetMs, productIds: '', currencyCode: 'USD', sessionId: 's', caller: 'browser' as const });
    const recipe = { source: 'traces', requests: [request(0), request(REPLAY_CAP_MS), request(REPLAY_CAP_MS * 2)] } as TrafficRecipe;
    expect(cappedRecipe(recipe, { speed: 1, capMs: REPLAY_CAP_MS }).requests).toHaveLength(2);
    expect(cappedRecipe(recipe, { speed: 2, capMs: REPLAY_CAP_MS }).requests).toHaveLength(3);
  });

  it('refuses an experiment whose estimate ends after minute 12', () => {
    const startedAt = '2026-09-14T00:00:00.000Z';
    const nowMs = Date.parse(startedAt) + 5 * 60_000;
    expect(explorationMinutesLeft({ startedAt, nowMs })).toBe(7);
    expect(experimentEndsInTime({ startedAt, nowMs }, 7)).toBe(true);
    expect(experimentEndsInTime({ startedAt, nowMs }, 8)).toBe(false);
  });
});
