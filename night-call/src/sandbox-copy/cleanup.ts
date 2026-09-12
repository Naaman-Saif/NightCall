import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { cleanupMarkerPath } from './constants';
import { stopEvents } from './docker-events';
import { requireNoProjectContainers, requireNoSandboxNetwork } from './preflight';
import { writeJson } from './run-files';
import { currentSandbox, forgetSandbox, sandboxIsStarted } from './sandbox';
import { sandboxCompose } from './sandbox-compose';
import { leaveSandboxNetwork } from './sandbox-network';
import { grantCleanupTime } from './time-budget';

export interface CleanupRecord {
  at: string;
  composeWritten: boolean;
  composeDown: string;
  errors: string[];
  clean: boolean;
}

let stopping: Promise<CleanupRecord> | null = null;

async function attempt(errors: string[], work: () => Promise<unknown>): Promise<void> {
  try {
    await work();
  } catch (error) {
    errors.push(String(error));
  }
}

async function takeStackDown(runFolder: string, errors: string[]): Promise<string> {
  if (!existsSync(join(runFolder, 'compose.json'))) return 'skipped: compose.json was never written';
  await attempt(errors, leaveSandboxNetwork);
  const down = ['down', '--volumes', '--remove-orphans'];
  await attempt(errors, () => sandboxCompose({ runFolder, args: down, timeoutMs: 120_000 }));
  return 'ran';
}

async function tearDown(): Promise<CleanupRecord> {
  const { runFolder, events } = currentSandbox();
  const errors: string[] = [];
  grantCleanupTime(240_000);
  const composeDown = await takeStackDown(runFolder, errors);
  if (events) stopEvents(events);
  await attempt(errors, requireNoProjectContainers);
  await attempt(errors, requireNoSandboxNetwork);
  const composeWritten = composeDown === 'ran';
  const record = { at: new Date().toISOString(), composeWritten, composeDown, errors, clean: errors.length === 0 };
  writeJson(join(runFolder, 'cleanup.json'), record);
  if (composeWritten && !record.clean) writeJson(cleanupMarkerPath, { runFolder, ...record });
  forgetSandbox();
  if (!record.clean) throw new Error(`sandbox cleanup failed: ${errors.join('; ')}`);
  return record;
}

export function stopSandbox(): Promise<CleanupRecord | null> {
  if (!stopping && !sandboxIsStarted()) return Promise.resolve(null);
  stopping = stopping ?? tearDown().finally(() => {
    stopping = null;
  });
  return stopping;
}
