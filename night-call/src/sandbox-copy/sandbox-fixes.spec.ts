import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { abortDockerCommands, runDockerOutput } from './docker-cli';
import { withProductionMemoryLimit } from './memory-limit-compose';
import { mismatchText } from './memory-limits';
import { sampleWith } from './samples.fixture';
import { interruptSandbox } from './signals';
import { interruptRequested } from './stop-request';
import { traceIdsToFetch } from './stage-traces';

function slowDockerOnPath(): void {
  const folder = mkdtempSync(join(tmpdir(), 'fake-docker-'));
  writeFileSync(join(folder, 'docker'), '#!/bin/sh\nsleep 30\n');
  chmodSync(join(folder, 'docker'), 0o755);
  process.env.PATH = `${folder}:${process.env.PATH ?? ''}`;
}

describe('sandbox fixes', () => {
  it('a signal records the interrupt and aborts the in-flight docker command without tearing down', async () => {
    slowDockerOnPath();
    const started = Date.now();
    const up = runDockerOutput({ args: ['compose', 'up', '-d'], timeoutMs: 60_000 });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(interruptSandbox('SIGTERM')).toBe(1);
    await expect(up).rejects.toThrow('docker compose up -d failed');
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(interruptRequested()).toBe(true);
    expect(abortDockerCommands()).toBe(0);
  });

  it('fetches every failed trace and at most 20 successful ones', () => {
    const healthy = Array.from({ length: 30 }, (_, index) => ({ ...sampleWith({}), traceId: `ok-${index}` }));
    const failed = [{ ...sampleWith({ status: 500 }), traceId: 'bad-1' }, { ...sampleWith({ status: null }), traceId: 'bad-2' }];
    const picked = traceIdsToFetch([...healthy.slice(0, 10), ...failed, ...healthy.slice(10)]);
    expect(picked.failed).toEqual(['bad-1', 'bad-2']);
    expect(picked.successful).toHaveLength(20);
    expect(picked.successful[0]).toBe('ok-0');
  });

  it('copies the live production memory limit into the sandbox service and drops other limits', () => {
    const service = { image: 'x', mem_limit: '1g', deploy: { resources: { limits: { memory: '1073741824', cpus: '1' } } } };
    const limited = withProductionMemoryLimit(service, 524288000);
    expect(limited.deploy).toEqual({ resources: { limits: { memory: '524288000', cpus: '1' } } });
    expect(limited.mem_limit).toBeUndefined();
    expect(withProductionMemoryLimit(service, 0).deploy).toEqual({ resources: { limits: { cpus: '1' } } });
  });

  it('names every service whose sandbox limit differs from production', () => {
    const checks = [
      { service: 'recommendation', productionBytes: 524288000, sandboxBytes: 524288000, matches: true },
      { service: 'frontend', productionBytes: 262144000, sandboxBytes: 0, matches: false },
    ];
    expect(mismatchText(checks)).toBe('frontend sandbox 0 production 262144000');
  });
});
