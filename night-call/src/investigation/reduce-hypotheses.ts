import type { IncidentEvent } from './event-types';
import { payloadOf } from './payload-schemas';
import { reducerFrom } from './reducer';
import type { Snapshot } from './snapshot';

function proposeHypothesis(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { hypothesisId, claim, supportingEvidenceIds, contradictingEvidenceIds, predicted, contradictions } = payloadOf(
    event,
    'hypothesis_proposed',
  );
  const others = snapshot.hypotheses.filter((hypothesis) => hypothesis.id !== hypothesisId);
  const proposed = {
    id: hypothesisId,
    claim,
    status: 'proposed' as const,
    supportingEvidenceIds,
    contradictingEvidenceIds,
    contradictions: contradictions ?? [],
    predicted,
    reason: null,
  };
  return { ...snapshot, hypotheses: [...others, proposed] };
}

function changeHypothesis(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { hypothesisId, status, reason } = payloadOf(event, 'hypothesis_status_changed');
  const hypotheses = snapshot.hypotheses.map((hypothesis) =>
    hypothesis.id === hypothesisId ? { ...hypothesis, status, reason } : hypothesis,
  );
  return { ...snapshot, hypotheses };
}

export const reduceHypotheses = reducerFrom({
  hypothesis_proposed: proposeHypothesis,
  hypothesis_status_changed: changeHypothesis,
});
