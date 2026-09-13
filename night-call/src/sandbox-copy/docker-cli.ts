import { execFile, type ChildProcess } from 'node:child_process';
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
const inFlight = new Set<ChildProcess>();

export function cleanEnvironment(): NodeJS.ProcessEnv {
  return { PATH: process.env.PATH, HOME: process.env.HOME };
}

export function abortDockerCommands(): number {
  const running = [...inFlight];
  for (const child of running) child.kill('SIGTERM');
  return running.length;
}

export async function runDockerOutput(command: DockerCommand): Promise<DockerOutput> {
  const options = { timeout: cappedMs(command.timeoutMs), maxBuffer: maxOutputBytes, env: cleanEnvironment() };
  const running = execute('docker', command.args, options);
  inFlight.add(running.child);
  try {
    return await running;
  } catch (error) {
    const failure = error as Error & { stderr?: string };
    const tail = String(failure.stderr ?? '').slice(-stderrTailLength);
    throw new Error(`docker ${command.args.slice(0, 3).join(' ')} failed: ${failure.message.slice(0, 300)} ${tail}`);
  } finally {
    inFlight.delete(running.child);
  }
}

export async function runDocker(command: DockerCommand): Promise<string> {
  const output = await runDockerOutput(command);
  return output.stdout;
}
