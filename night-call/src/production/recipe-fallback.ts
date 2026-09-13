import type { TraceWindow } from './jaeger-pages';
import type { Caller, RateSample, RecipeRequest } from './traffic-recipe-types';

const DEFAULT_PRODUCT = 'OLJCESPC7Z';
const MINUTE_MS = 60_000;

export type FallbackInput = { rateSeries: RateSample[]; window: TraceWindow; callerMix: Record<Caller, number> };

type CallerPlan = { shares: Map<Caller, number>; assigned: Map<Caller, number> };

function progressOf(caller: Caller, plan: CallerPlan): number {
  return (plan.assigned.get(caller) ?? 0) / (plan.shares.get(caller) ?? 1);
}

export function callerSequence(callerMix: Record<Caller, number>, total: number): Caller[] {
  const observed = (Object.entries(callerMix) as [Caller, number][]).filter(([, count]) => count > 0);
  const shares = new Map<Caller, number>(observed.length > 0 ? observed : [['locust', 1]]);
  const plan = { shares, assigned: new Map<Caller, number>() };
  return Array.from({ length: total }, () => {
    const caller = [...shares.keys()].reduce((best, candidate) => (progressOf(candidate, plan) < progressOf(best, plan) ? candidate : best));
    plan.assigned.set(caller, (plan.assigned.get(caller) ?? 0) + 1);
    return caller;
  });
}

function spreadOverMinute(sample: RateSample): number[] {
  const count = Math.round(sample.requestsPerSecond * 60);
  const minuteStartMs = Date.parse(sample.at) - MINUTE_MS;
  return Array.from({ length: count }, (_, index) => minuteStartMs + Math.floor((index * MINUTE_MS) / count));
}

export function fallbackRequests(input: FallbackInput): RecipeRequest[] {
  const moments = input.rateSeries.flatMap(spreadOverMinute).filter((at) => at <= input.window.toMs);
  const offsets = moments.map((at) => Math.max(0, at - input.window.fromMs)).sort((first, second) => first - second);
  const callers = callerSequence(input.callerMix, offsets.length);
  return offsets.map((offsetMs, index) => ({
    offsetMs,
    productIds: DEFAULT_PRODUCT,
    currencyCode: 'USD',
    sessionId: `fallback-${index}`,
    caller: callers[index],
  }));
}
