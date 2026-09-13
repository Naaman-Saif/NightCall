import { ROLES, type IncidentEvent } from './event-types';
import { payloadOf } from './payload-schemas';
import { plainPayload } from './plain-payload';
import { reducerFrom } from './reducer';
import { settleEndedRun } from './run-end';
import type { InvestigationState, Snapshot } from './snapshot';

const CONCLUDED_REASONS = new Set(['completed', 'insufficient_evidence']);
const AGENT_ACTORS = new Set<string>(ROLES);
const AGENT_DRIVEN_TYPES = new Set<string>(['investigation_started', 'investigation_stopped', 'evidence_recorded']);
const ENDING_TYPES = new Set<string>(['investigation_finished', 'budget_exhausted']);

function withInvestigation(snapshot: Snapshot, investigation: InvestigationState): Snapshot {
  return { ...snapshot, investigation };
}

function startInvestigation(snapshot: Snapshot): Snapshot {
  if (snapshot.incident.lifecycle === 'finished') return snapshot;
  return withInvestigation(snapshot, 'running');
}

function stopInvestigation(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  if (snapshot.incident.lifecycle === 'finished') return snapshot;
  const investigationStop = { ...plainPayload(payloadOf(event, 'investigation_stopped')), stoppedAt: event.occurredAt };
  return { ...snapshot, investigation: 'stopped', investigationStop };
}

function endInvestigation(snapshot: Snapshot, reason: string): Snapshot {
  if (snapshot.investigation !== 'running') return snapshot;
  return withInvestigation(snapshot, CONCLUDED_REASONS.has(reason) ? 'finished' : 'interrupted');
}

const handleEvent = reducerFrom({
  investigation_started: startInvestigation,
  investigation_stopped: stopInvestigation,
  investigation_finished: (snapshot, event) => endInvestigation(snapshot, payloadOf(event, 'investigation_finished').reason),
  budget_exhausted: (snapshot) => endInvestigation(snapshot, 'budget_exhausted'),
});

function agentActed(event: IncidentEvent): boolean {
  return AGENT_ACTORS.has(event.actor) || AGENT_DRIVEN_TYPES.has(event.type);
}

function startedByAgentWork(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const agentWork = AGENT_ACTORS.has(event.actor) && event.type !== 'investigation_stopped';
  if (!agentWork || snapshot.investigation !== 'not_started' || snapshot.incident.lifecycle === 'finished') return snapshot;
  return withInvestigation(snapshot, 'running');
}

export function reduceInvestigation(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const settled = ENDING_TYPES.has(event.type) ? settleEndedRun(snapshot, Date.parse(event.occurredAt)) : snapshot;
  const handled = startedByAgentWork(handleEvent(settled, event), event);
  const changedAt = handled.investigation === settled.investigation ? handled.investigationChangedAt : event.occurredAt;
  const lastAgentActivityAt = agentActed(event) ? event.occurredAt : handled.lastAgentActivityAt;
  return { ...handled, investigationChangedAt: changedAt, lastAgentActivityAt };
}
