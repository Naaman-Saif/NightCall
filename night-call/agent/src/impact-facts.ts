export type FailureReading = {
  evidenceId: string;
  errorShare: number | null;
  frontendShare?: number | null;
  frontendCallsPerSecond?: number | null;
  windowMinutes: number;
};
export type CrashReading = { evidenceId: string; outOfMemory: number; restarts: number; windowMinutes: number };
export type ImpactReadings = { failure: FailureReading | null; crashes: CrashReading | null };

export const QUESTION_ENDING = 'Is that tolerable while I test a fix, or should I rush the safest fix first?';

export function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function precisePercent(share: number): string {
  const hundredths = Math.floor(share * 10000 + 1e-9);
  return share > 0 && hundredths === 0 ? 'less than 0.01%' : `${(hundredths / 100).toFixed(2)}%`;
}

export function rateText(callsPerSecond: number): string {
  return (Math.floor(callsPerSecond * 100 + 1e-9) / 100).toFixed(2);
}

function frontendPart(reading: FailureReading): string {
  const share = reading.frontendShare ?? null;
  if (share === null) return "the failure rate of shoppers' recommendation requests could not be measured";
  const rate = reading.frontendCallsPerSecond == null ? '' : `, ${rateText(reading.frontendCallsPerSecond)} per second`;
  return `shoppers' recommendation requests failed ${precisePercent(share)} of the time (frontend${rate})`;
}

function servicePart(reading: FailureReading): string {
  if (reading.errorShare === null) return "the recommendation service's own error rate could not be measured";
  return `the recommendation service itself logged ${precisePercent(reading.errorShare)} errors`;
}

export function failureStatement(reading: FailureReading | null): string {
  const frontend = reading?.frontendShare ?? null;
  const service = reading?.errorShare ?? null;
  if (reading === null || (frontend === null && service === null)) return 'the request failure rate could not be measured yet';
  if (frontend === 0 && service === 0) return 'requests are not failing right now';
  return `${frontendPart(reading)} while ${servicePart(reading)}`;
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

export function evidenceIdsOf(readings: ImpactReadings): string[] {
  return [readings.failure?.evidenceId, readings.crashes?.evidenceId].filter((id): id is string => Boolean(id));
}
