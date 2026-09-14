import type { IncidentEvent } from './event-types';
import { acceptedReproductionOf } from './proof-sentence';
import type { Snapshot } from './snapshot';

const PROOF_EVENTS = new Set<string>(['experiment_reviewed', 'verification_reviewed', 'hypothesis_status_changed', 'cycle_finished']);

export function reduceProofStatus(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  if (!PROOF_EVENTS.has(event.type)) return snapshot;
  const reproduced = acceptedReproductionOf(snapshot);
  if (!reproduced) return snapshot;
  const status = snapshot.mitigation?.status === 'verified' ? ('verified' as const) : ('reproduced' as const);
  const hypotheses = snapshot.hypotheses.map((hypothesis) => (hypothesis.id === reproduced.hypothesisId ? { ...hypothesis, status } : hypothesis));
  return { ...snapshot, hypotheses };
}
