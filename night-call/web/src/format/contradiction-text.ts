import type { Contradiction } from '../api/contract';

export function contradictionFor(contradictions: Contradiction[] | undefined, evidenceId: string | null): string | null {
  if (!contradictions || !evidenceId) return null;
  const found = contradictions.find((entry) => entry.evidenceId === evidenceId);
  return found?.contradicts ? `Contradicts: ${found.contradicts}` : null;
}
