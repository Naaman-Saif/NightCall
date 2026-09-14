import { countWords } from '../investigation/count-words';
import type { CrashCounts } from '../investigation/snapshot';
import type { EventsBuffer } from '../recorder/events-buffer';
import type { ProductionEvent } from '../recorder/series-sample';
import { excerptOf, momentMinutesAgo, type Reading } from './reading';

export type EventsReadQuery = { service: string; minutes: number };

function countOf(events: ProductionEvent[], action: string): number {
  return events.filter((event) => event.action === action).length;
}

function lineOf(event: ProductionEvent): string {
  const exit = event.exitCode ? ` exitCode=${event.exitCode}` : '';
  return `${event.at} ${event.action} ${event.container}${exit}`;
}

function crashCountsOf(events: ProductionEvent[], since: string): CrashCounts {
  return { oom: countOf(events, 'oom'), die: countOf(events, 'die'), start: countOf(events, 'start'), since };
}

export function readOomEvents(events: EventsBuffer, query: EventsReadQuery): Reading {
  const after = new Date(momentMinutesAgo(query.minutes)).toISOString();
  const found = events.matching({ services: [query.service], after });
  const crashCounts = crashCountsOf(found, after);
  const counts = `${crashCounts.oom} out-of-memory events, ${crashCounts.die} exits and ${crashCounts.start} starts`;
  const summary = `${counts} for ${query.service} in the last ${query.minutes} minutes`;
  const exactSource = { kind: 'stored_excerpt' as const };
  const excerpt = excerptOf(found.map(lineOf));
  const value = `${countWords(crashCounts.oom, 'out-of-memory kill')}, ${countWords(crashCounts.start, 'restart')} in ${query.minutes} min`;
  return { kind: 'oom_events', source: `docker events: ${query.service}`, summary, excerpt, value, data: { events: found }, exactSource, crashCounts };
}
