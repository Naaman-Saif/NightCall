import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { settings } from '../config/settings';
import type { FlagStates } from './config-diff';

export interface GreenSnapshot {
  takenAt: string;
  flags: FlagStates;
}

export function lastGreenPath(): string {
  return join(settings.stateDir, 'snapshots', 'last-green.json');
}

export function readLastGreen(): GreenSnapshot | undefined {
  try {
    return JSON.parse(readFileSync(lastGreenPath(), 'utf8')) as GreenSnapshot;
  } catch {
    return undefined;
  }
}

export function writeLastGreen(flags: FlagStates): GreenSnapshot {
  const snapshot = { takenAt: new Date().toISOString(), flags };
  const path = lastGreenPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.tmp`, JSON.stringify(snapshot, null, 2));
  renameSync(`${path}.tmp`, path);
  return snapshot;
}
