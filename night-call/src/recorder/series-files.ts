import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function seriesPath(folder: string, service: string): string {
  return join(folder, 'series', `prod-${service}.jsonl`);
}

export function productionEventsPath(folder: string): string {
  return join(folder, 'series', 'prod-events.jsonl');
}

function parsedLine<Item>(line: string): Item[] {
  try {
    return [JSON.parse(line) as Item];
  } catch {
    return [];
  }
}

export function readJsonLines<Item>(path: string): Item[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .flatMap((line) => parsedLine<Item>(line));
}

export function appendJsonLines(path: string, items: unknown[]): void {
  if (items.length === 0) return;
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, items.map((item) => `${JSON.stringify(item)}\n`).join(''));
}

export function lastTimeIn(path: string): string | null {
  const items = readJsonLines<{ at: string }>(path);
  return items.at(-1)?.at ?? null;
}
