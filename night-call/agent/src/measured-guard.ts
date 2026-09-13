import { precisePercent, rateText, type FailureReading, type ImpactReadings } from './impact-facts.js';

const NUMBER = /\d+(?:\.\d+)?/g;

function digitsOf(text: string): string {
  return text.replace(/[^0-9.]/g, '');
}

function failureNumbers(failure: FailureReading | null): string[] {
  if (failure === null) return [];
  const shares = [failure.errorShare, failure.frontendShare ?? null].filter((share): share is number => share !== null);
  const rate = failure.frontendCallsPerSecond == null ? [] : [rateText(failure.frontendCallsPerSecond)];
  return [...shares.map((share) => digitsOf(precisePercent(share))), ...rate, String(failure.windowMinutes)];
}

function measuredNumbers(readings: ImpactReadings): Set<string> {
  const { crashes } = readings;
  const crashNumbers = crashes ? [String(crashes.outOfMemory), String(crashes.restarts), String(crashes.windowMinutes)] : [];
  return new Set([...failureNumbers(readings.failure), ...crashNumbers]);
}

export function unmeasuredNumbers(text: string, readings: ImpactReadings): string[] {
  const allowed = measuredNumbers(readings);
  return (text.match(NUMBER) ?? []).filter((number) => !allowed.has(number));
}

export function requireMeasured(text: string, readings: ImpactReadings): string {
  const unmeasured = unmeasuredNumbers(text, readings);
  if (unmeasured.length > 0) throw new Error(`text quotes numbers no reading measured: ${unmeasured.join(', ')}`);
  return text;
}
