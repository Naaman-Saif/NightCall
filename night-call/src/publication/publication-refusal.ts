import { runIsVerified } from '../investigation/current-run';
import type { Snapshot } from '../investigation/snapshot';

function proofRefusal(snapshot: Snapshot): string | null {
  if (snapshot.incident.completionReason === 'budget_exhausted') return 'the time budget is used up';
  if (!runIsVerified(snapshot)) return 'no approved 3 of 3 verification run';
  return snapshot.mitigation?.variant ? null : 'the mitigation has no flag variant';
}

export function publicationRefusal(snapshot: Snapshot, nowMs: number): string | null {
  if (snapshot.incident.lifecycle !== 'active') return `the incident is ${snapshot.incident.completionReason ?? 'finished'}`;
  if (Date.parse(snapshot.incident.deadlineAt) <= nowMs) return 'the time budget is used up';
  const proof = proofRefusal(snapshot);
  if (proof) return proof;
  const { state, repository } = snapshot.publication;
  const settled = state !== 'failed' && (state !== 'not_eligible' || repository !== null);
  return settled ? `publication is already ${state}` : null;
}

export function retryRefusal(snapshot: Snapshot): string | null {
  const proof = proofRefusal(snapshot);
  if (proof) return proof;
  const { state } = snapshot.publication;
  return state === 'failed' || state === 'publishing' ? null : `publication is ${state}, nothing to retry`;
}
