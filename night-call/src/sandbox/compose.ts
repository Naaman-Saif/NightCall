import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { projectAcceptsWrites, settings } from '../config/settings';

const run = promisify(execFile);
const baseFiles = ['compose.yaml', 'compose.full.yaml', 'compose.observability.yaml'];
const optionalFiles = ['compose.box-override.yaml'];
const composeTimeoutMs = 10 * 60 * 1000;

function fileArgs(files: string[]): string[] {
  return files.flatMap((file) => ['-f', file]);
}

export async function compose(project: string, args: string[]): Promise<string> {
  if (!projectAcceptsWrites(project)) throw new Error(`refusing to run compose against ${project}`);
  const present = optionalFiles.filter((file) => existsSync(join(settings.astronomyShopPath, file)));
  const files = [...baseFiles, ...present, 'compose.clone.yaml'];
  const full = ['compose', '--env-file', '.env', '--env-file', '.env.override', '-p', project, ...fileArgs(files), ...args];
  const { stdout } = await run('docker', full, { cwd: settings.astronomyShopPath, timeout: composeTimeoutMs, maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
