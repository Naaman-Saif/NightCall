import { readFileSync } from 'node:fs';

interface FlagDefinition { defaultVariant?: string; state?: string }
export interface FlagdConfig { flags: Record<string, FlagDefinition> }

export type FlagStates = Record<string, string>;

export interface FlagChange {
  flag: string;
  from: string;
  to: string;
}

export function flagStatesOf(config: FlagdConfig): FlagStates {
  const states: FlagStates = {};
  for (const [name, definition] of Object.entries(config.flags ?? {})) {
    states[name] = definition.state === 'DISABLED' ? 'disabled' : (definition.defaultVariant ?? '');
  }
  return states;
}

export function readFlagStates(path: string): FlagStates {
  return flagStatesOf(JSON.parse(readFileSync(path, 'utf8')) as FlagdConfig);
}

export function flagChangesBetween(before: FlagStates, after: FlagStates): FlagChange[] {
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...names]
    .filter((flag) => (before[flag] ?? 'absent') !== (after[flag] ?? 'absent'))
    .map((flag) => ({ flag, from: before[flag] ?? 'absent', to: after[flag] ?? 'absent' }))
    .sort((a, b) => a.flag.localeCompare(b.flag));
}
