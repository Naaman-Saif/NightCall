import { existsSync, readFileSync } from 'node:fs';

import type { IncidentEvent } from './event-types';
import { eventsPath } from './incident-paths';

export type ParsedLog = { content: string; events: IncidentEvent[]; brokenText: string };

function eventAt(line: string, sequence: number): IncidentEvent | null {
  try {
    const value = JSON.parse(line) as IncidentEvent;
    return value?.sequence === sequence && typeof value.type === 'string' ? value : null;
  } catch {
    return null;
  }
}

export function parseLog(content: string): ParsedLog {
  const lines = content.split('\n');
  const events: IncidentEvent[] = [];
  for (const line of lines) {
    const event = eventAt(line, events.length + 1);
    if (!event) break;
    events.push(event);
  }
  return { content, events, brokenText: lines.slice(events.length).join('\n') };
}

export function cleanLogText(events: IncidentEvent[]): string {
  return events.map((event) => `${JSON.stringify(event)}\n`).join('');
}

export function readLog(folder: string): ParsedLog {
  const path = eventsPath(folder);
  return parseLog(existsSync(path) ? readFileSync(path, 'utf8') : '');
}

export function logStartsWithAlert(log: ParsedLog): boolean {
  return log.events[0]?.type === 'alert_received';
}
