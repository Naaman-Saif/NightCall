import type { ProductionEvent } from './series-sample';

type DockerEventJson = {
  Action?: string;
  time?: number;
  timeNano?: number;
  Actor?: { ID?: string; Attributes?: Record<string, string> };
};

const WATCHED_ACTIONS = new Set(['oom', 'die', 'start']);

function parsedJson(line: string): DockerEventJson | null {
  try {
    return JSON.parse(line) as DockerEventJson;
  } catch {
    return null;
  }
}

export function productionEventOf(line: string): ProductionEvent | null {
  const raw = parsedJson(line);
  const attributes = raw?.Actor?.Attributes ?? {};
  if (!raw?.Action || !WATCHED_ACTIONS.has(raw.Action) || !raw.time) return null;
  const container = attributes.name ?? raw.Actor?.ID ?? 'unknown';
  const service = attributes['com.docker.compose.service'] ?? container;
  const id = `${raw.timeNano ?? raw.time}-${container}-${raw.Action}`;
  const at = new Date(raw.time * 1000).toISOString();
  return { id, at, service, container, action: raw.Action, exitCode: attributes.exitCode ?? null };
}

export function splitLines(text: string): { lines: string[]; rest: string } {
  const parts = text.split('\n');
  const rest = parts.pop() ?? '';
  return { lines: parts.filter((line) => line.trim() !== ''), rest };
}
