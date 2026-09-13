import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildSandboxCompose } from './build-sandbox-compose';
import { stopSandbox } from './cleanup';
import { cleanupMarkerPath, runsPath } from './constants';
import { prepareSandbox, startSandbox } from './sandbox';
import { sandboxCompose } from './sandbox-compose';
import { requestInterrupt } from './stop-request';

jest.mock('./constants', () => {
  const fs = jest.requireActual<typeof import('node:fs')>('node:fs');
  const os = jest.requireActual<typeof import('node:os')>('node:os');
  const runs = fs.mkdtempSync(`${os.tmpdir()}/nc-sandbox-spec-`);
  return { ...jest.requireActual('./constants'), runsPath: runs, cleanupMarkerPath: `${runs}/marker.json` };
});
jest.mock('./preflight', () => ({ preflight: jest.fn(), requireNoProjectContainers: jest.fn(), requireNoSandboxNetwork: jest.fn() }));
jest.mock('./build-sandbox-compose', () => ({ buildSandboxCompose: jest.fn() }));
jest.mock('./sandbox-flag', () => ({ setSandboxFlag: jest.fn() }));
jest.mock('./stack-ready', () => ({ bringStackUp: jest.fn().mockResolvedValue('http://frontend:8080') }));
jest.mock('./docker-events', () => ({ startEvents: jest.fn().mockReturnValue({}), stopEvents: jest.fn() }));
jest.mock('./sandbox-network', () => ({ leaveSandboxNetwork: jest.fn() }));
jest.mock('./sandbox-compose', () => ({ sandboxCompose: jest.fn().mockResolvedValue('') }));
jest.mock('./late-containers', () => ({
  sweepLateSandboxResources: jest.fn().mockResolvedValue({ containersRemoved: [], networkRemoved: false }),
}));

function writesCompose(): void {
  jest.mocked(buildSandboxCompose).mockImplementationOnce(async (runFolder) => {
    writeFileSync(join(runFolder, 'compose.json'), '{}');
    return {};
  });
}

describe('sandbox cleanup', () => {
  beforeEach(() => jest.mocked(sandboxCompose).mockClear());

  it('skips compose down and writes no marker when compose.json was never written', async () => {
    jest.mocked(buildSandboxCompose).mockRejectedValueOnce(new Error('render failed'));
    await expect(prepareSandbox('early-failure')).rejects.toThrow('render failed');
    const record = await stopSandbox();
    expect(record).toMatchObject({ clean: true, composeWritten: false, composeDown: 'skipped: compose.json was never written' });
    expect(sandboxCompose).not.toHaveBeenCalled();
    expect(existsSync(cleanupMarkerPath)).toBe(false);
    expect(JSON.parse(readFileSync(join(runsPath, 'early-failure', 'cleanup.json'), 'utf8')).composeWritten).toBe(false);
  });

  it('lets one process start a new stack after a normal stop', async () => {
    writesCompose();
    await startSandbox('stack-one');
    expect(await stopSandbox()).toMatchObject({ clean: true, composeDown: 'ran' });
    expect(sandboxCompose).toHaveBeenCalledWith(expect.objectContaining({ args: ['down', '--volumes', '--remove-orphans'] }));
    writesCompose();
    await expect(startSandbox('stack-two')).resolves.toMatchObject({ endpoint: 'http://frontend:8080' });
    await stopSandbox();
  });

  it('refuses a new stack after an interrupt', async () => {
    requestInterrupt('SIGTERM');
    await expect(startSandbox('stack-three')).rejects.toThrow('sandbox interrupted: SIGTERM');
  });
});
