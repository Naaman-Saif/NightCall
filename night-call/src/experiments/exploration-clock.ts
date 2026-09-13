const MINUTE_MS = 60_000;
export const EXPLORATION_END_MINUTE = 12;
export const VERIFICATION_START_END_MINUTE = 13;

export type ClockReading = { startedAt: string; nowMs: number };

function minutesUntil(reading: ClockReading, minute: number): number {
  const endMs = Date.parse(reading.startedAt) + minute * MINUTE_MS;
  return Math.max(0, Math.floor((endMs - reading.nowMs) / MINUTE_MS));
}

export function explorationMinutesLeft(reading: ClockReading): number {
  return minutesUntil(reading, EXPLORATION_END_MINUTE);
}

export function verificationStartMinutesLeft(reading: ClockReading): number {
  return minutesUntil(reading, VERIFICATION_START_END_MINUTE);
}

export function experimentEndsInTime(reading: ClockReading, estimatedMinutes: number): boolean {
  const endMs = Date.parse(reading.startedAt) + EXPLORATION_END_MINUTE * MINUTE_MS;
  return reading.nowMs + estimatedMinutes * MINUTE_MS <= endMs;
}
