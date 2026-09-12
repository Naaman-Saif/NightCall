import { closeSync, mkdirSync, openSync, writeFileSync, writeSync } from 'node:fs';
import { dirname, join, relative, isAbsolute } from 'node:path';

import { runsPath } from './constants';

export interface JsonLinesWriter {
  write(value: unknown): void;
  close(): void;
}

const runIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function isInside(child: string, parent: string): boolean {
  const path = relative(parent, child);
  return path.length > 0 && !path.startsWith('..') && !isAbsolute(path);
}

export function runFolderFor(runId: string): string {
  if (!runIdPattern.test(runId)) throw new Error(`run id ${runId} is not a plain name`);
  return join(runsPath, runId);
}

export function createRunFolder(runFolder: string): void {
  process.umask(0o077);
  mkdirSync(runFolder);
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

export function openJsonLines(path: string): JsonLinesWriter {
  mkdirSync(dirname(path), { recursive: true });
  const descriptor = openSync(path, 'w');
  return {
    write: (value) => writeSync(descriptor, JSON.stringify(value) + '\n'),
    close: () => closeSync(descriptor),
  };
}
