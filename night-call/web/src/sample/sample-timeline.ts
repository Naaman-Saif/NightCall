import type { IncidentEvent } from '../api/contract';

export const SAMPLE_STEP_MS = 10_000;
export const SAMPLE_WINDOW_BEFORE_ALARM_MS = 15 * 60_000;
export const CONFIG_CHANGE_BEFORE_ALARM_MS = 12 * 60_000;
export const CRASH_BEFORE_ALARM_MS = 50_000;
export const RESTART_BEFORE_ALARM_MS = 30_000;

export type SampleTimeline = { alarmAt: number; endAt: number };

export function sampleTimelineOf(events: IncidentEvent[]): SampleTimeline | null {
  const alert = events.find((event) => event.type === 'alert_received') as IncidentEvent<'alert_received'> | undefined;
  if (!alert) return null;
  const alarmAt = Date.parse(alert.payload.startedAt);
  const lastEventAt = Date.parse(events[events.length - 1].occurredAt);
  return { alarmAt, endAt: Math.max(lastEventAt, alarmAt + SAMPLE_STEP_MS) };
}

export function isoAt(time: number): string {
  return new Date(time).toISOString();
}
