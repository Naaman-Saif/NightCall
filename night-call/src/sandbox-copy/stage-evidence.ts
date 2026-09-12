import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { evidenceServices, sandboxContainerName } from './constants';
import { containerAddress } from './container-address';
import { runDockerOutput } from './docker-cli';
import { writeJson } from './run-files';

export interface EvidenceRequest {
  runFolder: string;
  name: string;
  since: Date;
}

const tracesTimeoutMs = 15_000;

async function serviceLogs(service: string, since: Date): Promise<string> {
  const args = ['logs', '--since', since.toISOString(), '--timestamps', '--tail', '15000', sandboxContainerName(service)];
  try {
    const output = await runDockerOutput({ args, timeoutMs: 20_000 });
    return output.stdout + output.stderr;
  } catch (error) {
    return `log collection failed: ${String(error)}\n`;
  }
}

async function collectTraces(folder: string): Promise<void> {
  try {
    const address = await containerAddress('jaeger');
    const url = `http://${address}:16686/jaeger/ui/api/traces?service=recommendation&limit=300`;
    const response = await fetch(url, { signal: AbortSignal.timeout(tracesTimeoutMs) });
    if (!response.ok) throw new Error(`jaeger answered ${response.status}`);
    writeJson(join(folder, 'traces.json'), await response.json());
  } catch (error) {
    writeJson(join(folder, 'trace-error.json'), { error: String(error), at: new Date().toISOString() });
  }
}

export async function collectEvidence(request: EvidenceRequest): Promise<void> {
  const folder = join(request.runFolder, request.name);
  mkdirSync(folder, { recursive: true });
  for (const service of evidenceServices) {
    writeFileSync(join(folder, `${service}.log`), await serviceLogs(service, request.since));
  }
  await collectTraces(folder);
}
