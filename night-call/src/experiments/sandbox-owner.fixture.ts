import type { SandboxOwner } from './sandbox-owner';

export const idleSandboxOwner = {
  workerFor: () => Promise.resolve({}),
  warmUp: () => Promise.resolve('idle'),
  stackStartMinutes: () => 1,
  freshStack: () => Promise.resolve('idle'),
  release: () => Promise.resolve(),
} as unknown as SandboxOwner;
