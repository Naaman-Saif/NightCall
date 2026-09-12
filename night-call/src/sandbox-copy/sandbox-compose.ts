import { join } from 'node:path';

import { sandboxProject } from './constants';
import { runDocker } from './docker-cli';
import { requireNoStopRequest } from './stop-request';
import { requireSandboxProject } from './write-guard';

export interface SandboxComposeCommand {
  runFolder: string;
  args: string[];
  timeoutMs?: number;
  project?: string;
}

export function sandboxCompose(command: SandboxComposeCommand): Promise<string> {
  const project = command.project ?? sandboxProject;
  requireSandboxProject(project);
  if (command.args[0] !== 'down') requireNoStopRequest();
  const file = join(command.runFolder, 'compose.json');
  const args = ['compose', '-p', project, '-f', file, ...command.args];
  return runDocker({ args, timeoutMs: command.timeoutMs ?? 240_000 });
}
