export type FailureReading = { evidenceId: string; errorShare: number | null; windowMinutes: number };
export type CrashReading = { evidenceId: string; outOfMemory: number; restarts: number; windowMinutes: number };
export type ImpactReadings = { failure: FailureReading | null; crashes: CrashReading | null };

export const QUESTION_ENDING = 'Is that tolerable while I test a fix, or should I rush the safest fix first?';

const NUMBER = /\d+(?:\.\d+)?/g;

export function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function percentText(share: number): string {
  const tenths = Math.floor(share * 1000 + 1e-9);
  return tenths === 0 ? 'less than 0.1%' : `${(tenths / 10).toFixed(1)}%`;
}

export function failureStatement(reading: FailureReading | null): string {
  if (reading === null || reading.errorShare === null) return 'the request failure rate could not be measured yet';
  if (reading.errorShare === 0) return 'requests are not failing right now';
  return `${percentText(reading.errorShare)} of recommendation requests failed in the last ${reading.windowMinutes} minutes`;
}

function timesText(count: number): string {
  return count === 1 ? 'once' : `${count} times`;
}

export function crashStatement(reading: CrashReading): string {
  const window = `in the last ${reading.windowMinutes} minutes`;
  if (reading.outOfMemory === 0 && reading.restarts === 0) return `the service did not run out of memory or restart ${window}`;
  if (reading.outOfMemory === 0) return `the service did not run out of memory but restarted ${timesText(reading.restarts)} ${window}`;
  if (reading.outOfMemory === reading.restarts) return `the service ran out of memory and restarted ${timesText(reading.restarts)} ${window}`;
  return `the service ran out of memory ${timesText(reading.outOfMemory)} and restarted ${timesText(reading.restarts)} ${window}`;
}

export function impactQuestionText(readings: ImpactReadings): string {
  const facts = [failureStatement(readings.failure)];
  if (readings.crashes) facts.push(crashStatement(readings.crashes));
  return `${capitalized(facts.join(', and '))}. ${QUESTION_ENDING}`;
}

export function precisePercent(share: number): string {
  const hundredths = Math.floor(share * 10000 + 1e-9);
  return share > 0 && hundredths === 0 ? 'less than 0.01%' : `${(hundredths / 100).toFixed(2)}%`;
}

function failureNumbers(failure: FailureReading | null): string[] {
  if (failure === null || failure.errorShare === null) return [];
  const shown = failure.errorShare > 0 ? [percentText(failure.errorShare), precisePercent(failure.errorShare)] : [precisePercent(0)];
  return [...shown.map((text) => text.replace(/[^0-9.]/g, '')), String(failure.windowMinutes)];
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

export function evidenceIdsOf(readings: ImpactReadings): string[] {
  return [readings.failure?.evidenceId, readings.crashes?.evidenceId].filter((id): id is string => Boolean(id));
}
