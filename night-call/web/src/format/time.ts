const SECONDS_PER_HOUR = 3600;
const JUST_NOW_WITHIN_MS = 10_000;

export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}

export function formatAbsolute(isoTime: string): string {
  return `${new Date(isoTime).toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

export function formatTimeOfDay(isoTime: string): string {
  return new Date(isoTime).toISOString().slice(11, 19);
}

export function formatClock(isoTime: string): string {
  return `${formatTimeOfDay(isoTime)} UTC`;
}

export function formatAgo(isoTime: string, now: number): string {
  const elapsed = now - Date.parse(isoTime);
  if (elapsed < JUST_NOW_WITHIN_MS) return 'just now';
  return `${formatDuration(elapsed)} ago`;
}
