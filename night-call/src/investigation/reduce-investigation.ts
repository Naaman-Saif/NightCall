import type { IncidentEvent } from './event-types';
import { payloadOf } from './payload-schemas';
import { reducerFrom } from './reducer';
import type { InvestigationState, Snapshot } from './snapshot';

const CONCLUDED_REASONS = new Set(['completed', 'insufficient_evidence']);

function withInvestigation(snapshot: Snapshot, investigation: InvestigationState): Snapshot {
  return { ...snapshot, investigation };
}

function startInvestigation(snapshot: Snapshot): Snapshot {
  if (snapshot.incident.lifecycle === 'finished') return snapshot;
  return withInvestigation(snapshot, 'running');
}

function endInvestigation(snapshot: Snapshot, reason: string): Snapshot {
  if (snapshot.investigation !== 'running') return snapshot;
  return withInvestigation(snapshot, CONCLUDED_REASONS.has(reason) ? 'finished' : 'interrupted');
}

function finishInvestigation(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  return endInvestigation(snapshot, payloadOf(event, 'investigation_finished').reason);
}

export const reduceInvestigation = reducerFrom({
  investigation_started: startInvestigation,
  investigation_finished: finishInvestigation,
  budget_exhausted: (snapshot) => endInvestigation(snapshot, 'budget_exhausted'),
});
