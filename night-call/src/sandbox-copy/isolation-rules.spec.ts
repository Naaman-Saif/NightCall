import { validateSandboxCompose } from './isolation-rules';
import type { ComposeDocument } from './production-compose';

const runFolder = '/runs/r1';

function validDocument(): ComposeDocument {
  return {
    name: 'nc-sandbox',
    networks: { default: { name: 'nc-sandbox-network', driver: 'bridge', internal: true } },
    services: {
      flagd: {
        container_name: 'nc-sandbox-flagd',
        ports: [],
        networks: { default: null },
        volumes: [{ type: 'bind', source: '/runs/r1/assets/src/flagd', target: '/etc/flagd', read_only: true }],
      },
    },
  };
}

function check(change: (document: ComposeDocument) => void): () => void {
  const document = validDocument();
  change(document);
  return () => validateSandboxCompose({ document, runFolder });
}

describe('isolation rules', () => {
  it('accepts an isolated document', () => {
    expect(check(() => undefined)).not.toThrow();
  });

  it('rejects published ports', () => {
    expect(check((document) => { document.services.flagd.ports = ['8013:8013']; })).toThrow(/ports/);
  });

  it('rejects the docker socket', () => {
    const socket = { type: 'bind', source: '/runs/r1/assets/sock', target: '/var/run/docker.sock', read_only: true };
    expect(check((document) => { document.services.flagd.volumes = [socket]; })).toThrow(/host target/);
  });

  it('rejects writable binds', () => {
    const writable = { type: 'bind', source: '/runs/r1/assets/data', target: '/data', read_only: false };
    expect(check((document) => { document.services.flagd.volumes = [writable]; })).toThrow(/read-only/);
  });

  it('rejects binds outside the run folder', () => {
    const outside = { type: 'bind', source: '/root/code/astronomy-shop/src', target: '/data', read_only: true };
    expect(check((document) => { document.services.flagd.volumes = [outside]; })).toThrow(/outside/);
  });

  it('rejects a network that is not internal', () => {
    const open = { default: { name: 'nc-sandbox-network', internal: false } };
    expect(check((document) => { document.networks = open; })).toThrow(/internal/);
  });

  it('rejects a foreign project name', () => {
    expect(check((document) => { document.name = 'prod'; })).toThrow(/prod/);
  });

  it('rejects top-level volumes', () => {
    expect(check((document) => { document.volumes = { data: {} }; })).toThrow(/volumes/);
  });
});
