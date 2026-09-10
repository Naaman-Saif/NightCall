import { readFileSync, writeFileSync } from 'node:fs';

import type { FlagdConfig, FlagStates } from '../evidence/config-diff';

export function readFlagdConfig(path: string): FlagdConfig {
  return JSON.parse(readFileSync(path, 'utf8')) as FlagdConfig;
}

export function writeFlagdConfig(path: string, config: FlagdConfig): void {
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
}

export function withFlagStates(config: FlagdConfig, states: FlagStates): FlagdConfig {
  const flags = { ...config.flags };
  for (const [name, variant] of Object.entries(states)) {
    if (flags[name] && variant !== 'disabled' && variant !== 'absent') flags[name] = { ...flags[name], defaultVariant: variant };
  }
  return { ...config, flags };
}

export function setFlagInFile(path: string, change: { flag: string; to: string }): void {
  const config = readFlagdConfig(path);
  writeFlagdConfig(path, withFlagStates(config, { [change.flag]: change.to }));
}
