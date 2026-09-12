import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { cappedMs } from './time-budget';

export interface DockerCommand {
  args: string[];
  timeoutMs: number;
}

export interface DockerOutput {
  stdout: string;
  stderr: string;
}

const execute = promisify(execFile);
const stderrTailLength = 4000;
const maxOutputBytes = 64 * 1024 * 1024;

export function cleanEnvironment(): NodeJS.ProcessEnv {
  return { PATH: process.env.PATH, HOME: process.env.HOME };
}

export async function runDockerOutput(command: DockerCommand): Promise<DockerOutput> {
  const options = { timeout: cappedMs(command.timeoutMs), maxBuffer: maxOutputBytes, env: cleanEnvironment() };
  try {
    return await execute('docker', command.args, options);
  } catch (error) {
    const failure = error as Error & { stderr?: string };
    const tail = String(failure.stderr ?? '').slice(-stderrTailLength);
    throw new Error(`docker ${command.args.slice(0, 3).join(' ')} failed: ${failure.message.slice(0, 300)} ${tail}`);
  }
}

export async function runDocker(command: DockerCommand): Promise<string> {
  const output = await runDockerOutput(command);
  return output.stdout;
}
