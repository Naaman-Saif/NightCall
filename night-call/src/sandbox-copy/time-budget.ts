import { budgetMs } from './constants';

let startedAt = Date.now();

export function startBudget(): void {
  startedAt = Date.now();
}

export function remainingMs(): number {
  return Math.max(0, budgetMs - (Date.now() - startedAt));
}

export function grantCleanupTime(cleanupMs: number): void {
  if (remainingMs() < cleanupMs) startedAt = Date.now() - budgetMs + cleanupMs;
}

export function cappedMs(wantedMs: number): number {
  const remaining = remainingMs();
  if (remaining <= 0) throw new Error('sandbox time budget exhausted');
  return Math.min(wantedMs, remaining);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withinBudget<T>(work: Promise<T>, wantedMs: number): Promise<T> {
  const limitMs = cappedMs(wantedMs);
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`docker call exceeded ${limitMs} ms`)), limitMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
