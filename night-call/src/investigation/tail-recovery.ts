import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { cleanLogText, readLog } from './event-lines';
import type { IncidentEvent } from './event-types';
import { eventsPath } from './incident-paths';
import { replaceFile } from './replace-file';

function brokenTailPath(folder: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return join(folder, `events.broken-${stamp}.jsonl`);
}

export function recoverLog(folder: string): IncidentEvent[] {
  const log = readLog(folder);
  const cleanText = cleanLogText(log.events);
  if (log.content === cleanText) return log.events;
  if (log.brokenText.trim() !== '') writeFileSync(brokenTailPath(folder), log.brokenText);
  replaceFile(eventsPath(folder), cleanText);
  return log.events;
}
