import type { SandboxOwner } from './sandbox-owner';

export const idleSandboxOwner = {
  workerFor: () => Promise.resolve({}),
  warmUp: () => Promise.resolve('idle'),
  isWarmFor: () => false,
  release: () => Promise.resolve(),
} as unknown as SandboxOwner;
