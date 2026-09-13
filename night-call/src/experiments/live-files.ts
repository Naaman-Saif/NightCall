import { NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { LiveProgress } from './live-progress-types';

const PLAIN_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function liveExperimentPath(folder: string, experimentId: string): string {
  if (!PLAIN_ID.test(experimentId)) throw new NotFoundException({ code: 'live_not_found' });
  return join(folder, 'live', `experiment-${experimentId}.json`);
}

export function liveCyclePath(folder: string, cycle: number): string {
  if (![1, 2, 3].includes(cycle)) throw new NotFoundException({ code: 'live_not_found' });
  return join(folder, 'live', `cycle-${cycle}.json`);
}

export function writeLive(path: string, progress: LiveProgress): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, JSON.stringify(progress));
  renameSync(temporary, path);
}

export function readLive(path: string): LiveProgress {
  if (!existsSync(path)) throw new NotFoundException({ code: 'live_not_found' });
  return JSON.parse(readFileSync(path, 'utf8')) as LiveProgress;
}
