import { spawn, type ChildProcess } from 'node:child_process';
import { closeSync, openSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { sandboxContainerName, sandboxProject } from './constants';
import { cleanEnvironment } from './docker-cli';

export interface EventsStream {
  process: ChildProcess;
  descriptor: number;
}

interface DockerEvent {
  Action?: string;
  time?: number;
  Actor?: { Attributes?: Record<string, string> };
}

export function eventsPath(runFolder: string): string {
  return join(runFolder, 'docker-events.jsonl');
}

export function startEvents(runFolder: string): EventsStream {
  const descriptor = openSync(eventsPath(runFolder), 'w');
  const filter = `label=com.docker.compose.project=${sandboxProject}`;
  const args = ['events', '--filter', filter, '--format', '{{json .}}'];
  const child = spawn('docker', args, { stdio: ['ignore', descriptor, 'ignore'], env: cleanEnvironment() });
  return { process: child, descriptor };
}

export function stopEvents(stream: EventsStream): void {
  stream.process.kill('SIGTERM');
  closeSync(stream.descriptor);
}

export function recommendationOomEvents(runFolder: string, sinceSeconds: number): DockerEvent[] {
  const lines = readFileSync(eventsPath(runFolder), 'utf8').split('\n').filter((line) => line.trim());
  const events = lines.map((line) => JSON.parse(line) as DockerEvent);
  const name = sandboxContainerName('recommendation');
  return events.filter((event) => event.Action === 'oom' && (event.time ?? 0) >= sinceSeconds
    && event.Actor?.Attributes?.name === name);
}
