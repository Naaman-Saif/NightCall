import type { RecordedReading } from './evidence-ledger.js';

export type SettledClaim = { claim: string; checkedText: string; rephrased: string[] };

const TIMESTAMP = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g;
const NUMBER = /(?<![A-Za-z0-9_.])\d+(?:\.\d+)?(?![0-9_])/g;
const INTERVAL = /\b(?:(?:about|around|roughly)\s+)?every\s+(?:~\s*|about\s+|around\s+|roughly\s+)?(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h)\b/gi;
const SECONDS_PER_UNIT: Record<string, number> = { s: 1, m: 60, h: 3600 };
const CRASH_LINE = /^(\S+)\s+oom\s/;
const INTERVAL_SLACK = 0.25;

export function numbersIn(text: string): string[] {
  return text.replace(TIMESTAMP, ' ').match(NUMBER) ?? [];
}

function decimalsOf(number: string): number {
  return number.split('.')[1]?.length ?? 0;
}

function sameValue(quoted: string, measured: string): boolean {
  return Number(Number(measured).toFixed(decimalsOf(quoted))) === Number(quoted);
}

export function unmatchedNumbers(text: string, readingTexts: string[]): string[] {
  const measured = readingTexts.flatMap(numbersIn);
  return numbersIn(text).filter((quoted) => !measured.some((value) => sameValue(quoted, value)));
}

export function crashGapsSeconds(readings: RecordedReading[]): number[] {
  const lines = readings.filter((reading) => reading.reader === 'oom-events').flatMap((reading) => reading.excerpt.split('\n'));
  const times = lines
    .map((line) => CRASH_LINE.exec(line.trim())?.[1])
    .filter((time): time is string => Boolean(time))
    .map((time) => Date.parse(time))
    .sort((first, second) => first - second);
  return times.slice(1).map((time, index) => (time - times[index]) / 1000);
}

function intervalSupported(seconds: number, gaps: number[]): boolean {
  if (gaps.length === 0) return false;
  return seconds >= Math.min(...gaps) * (1 - INTERVAL_SLACK) && seconds <= Math.max(...gaps) * (1 + INTERVAL_SLACK);
}

export function settleIntervals(claim: string, readings: RecordedReading[]): SettledClaim {
  const gaps = crashGapsSeconds(readings);
  const rephrased: string[] = [];
  const settledClaim = claim.replace(INTERVAL, (phrase: string, ...groups: string[]) => {
    const seconds = Number(groups[0]) * (SECONDS_PER_UNIT[groups[1].toLowerCase().charAt(0)] ?? 60);
    if (intervalSupported(seconds, gaps)) return phrase;
    rephrased.push(phrase);
    return 'repeatedly';
  });
  return { claim: settledClaim, checkedText: settledClaim.replace(INTERVAL, ' '), rephrased };
}
