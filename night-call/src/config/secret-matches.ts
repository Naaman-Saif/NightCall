import { createHash, timingSafeEqual } from 'node:crypto';

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function secretMatches(given: string, expected: string): boolean {
  if (expected === '') return false;
  return timingSafeEqual(digest(given), digest(expected));
}
