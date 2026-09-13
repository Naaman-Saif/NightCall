import type { StreamRequest } from './stream-connection';

function sequenceFrom(value: unknown): number | null {
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text !== 'string' || !/^\d{1,9}$/.test(text.trim())) return null;
  return Number(text.trim());
}

export function resumeAfter(request: StreamRequest): number {
  return sequenceFrom(request.headers['last-event-id']) ?? sequenceFrom(request.query.after) ?? 0;
}
