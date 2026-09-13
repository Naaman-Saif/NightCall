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

export function readOomEvents(events: EventsBuffer, query: EventsReadQuery): Reading {
  const after = new Date(momentMinutesAgo(query.minutes)).toISOString();
  const found = events.matching({ services: [query.service], after });
  const counts = `${countOf(found, 'oom')} out-of-memory events, ${countOf(found, 'die')} exits and ${countOf(found, 'start')} starts`;
  const summary = `${counts} for ${query.service} in the last ${query.minutes} minutes`;
  return { kind: 'oom_events', source: `docker events: ${query.service}`, summary, excerpt: excerptOf(found.map(lineOf)), data: { events: found } };
}
