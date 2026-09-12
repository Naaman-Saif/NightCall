import { sandboxCompose } from './sandbox-compose';
import { requireSandboxProject } from './write-guard';

describe('write guard', () => {
  it('allows only the sandbox project', () => {
    expect(() => requireSandboxProject('nc-sandbox')).not.toThrow();
    expect(() => requireSandboxProject('prod')).toThrow(/prod/);
    expect(() => requireSandboxProject('clone')).toThrow(/clone/);
  });

  it('refuses compose against production before running docker', () => {
    expect(() => sandboxCompose({ runFolder: '/runs/r1', args: ['down'], project: 'prod' })).toThrow(/prod/);
  });
});
