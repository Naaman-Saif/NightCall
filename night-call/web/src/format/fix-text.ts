import type { Mitigation } from '../api/contract';

const CACHE_FLAG = 'recommendationCacheFailure';
const OFF_VARIANT = 'off';

function flagAction(variant: string): string {
  return variant === OFF_VARIANT ? `Turn ${CACHE_FLAG} off` : `Set ${CACHE_FLAG} to ${variant}`;
}

export function describeFixAction(mitigation: Mitigation, service: string): string | null {
  if (!mitigation.variant) return null;
  const restart = mitigation.restart ? `, then restart ${service}` : '';
  return `${flagAction(mitigation.variant)}${restart}`;
}
