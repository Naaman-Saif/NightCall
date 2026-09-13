import type { Hypothesis, IncidentEvent, Snapshot } from '../api/contract';
import { reducerFrom } from './reducer-table';

function recordEvidence(snapshot: Snapshot, event: IncidentEvent<'evidence_recorded'>): Snapshot {
  const { evidenceId, kind, source, summary, observedAt, excerpt } = event.payload;
  const evidence = { ...snapshot.evidence, [evidenceId]: { kind, source, summary, observedAt, excerpt } };
  return { ...snapshot, evidence };
}

function proposeHypothesis(snapshot: Snapshot, event: IncidentEvent<'hypothesis_proposed'>): Snapshot {
  const { hypothesisId, claim, supportingEvidenceIds, contradictingEvidenceIds, predicted } = event.payload;
  const others = snapshot.hypotheses.filter((hypothesis) => hypothesis.id !== hypothesisId);
  const proposed: Hypothesis = {
    id: hypothesisId,
    claim,
    status: 'proposed',
    supportingEvidenceIds,
    contradictingEvidenceIds,
    predicted,
    reason: null,
  };
  return { ...snapshot, hypotheses: [...others, proposed] };
}

function changeHypothesis(snapshot: Snapshot, event: IncidentEvent<'hypothesis_status_changed'>): Snapshot {
  const { hypothesisId, status, reason } = event.payload;
  const hypotheses = snapshot.hypotheses.map((hypothesis) =>
    hypothesis.id === hypothesisId ? { ...hypothesis, status, reason } : hypothesis,
  );
  return { ...snapshot, hypotheses };
}

export const reduceEvidenceAndHypotheses = reducerFrom({
  evidence_recorded: recordEvidence,
  hypothesis_proposed: proposeHypothesis,
  hypothesis_status_changed: changeHypothesis,
});
