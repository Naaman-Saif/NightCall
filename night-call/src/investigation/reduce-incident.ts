import type { IncidentEvent } from './event-types';
import { payloadOf } from './payload-schemas';
import { reducerFrom, type Reducer } from './reducer';
import type { CompletionReason, Snapshot } from './snapshot';

function seedIncident(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const alert = payloadOf(event, 'alert_received');
  const { label, service, alertName, severity, startedAt, deadlineAt } = alert;
  const incident = { ...snapshot.incident, label, service, alertName, severity, startedAt, deadlineAt };
  return { ...snapshot, incident };
}

function finish(reason: CompletionReason): Reducer {
  return (snapshot) => {
    if (snapshot.incident.lifecycle === 'finished') return snapshot;
    const incident = { ...snapshot.incident, lifecycle: 'finished' as const, phase: 'handoff', completionReason: reason };
    return { ...snapshot, incident };
  };
}

function movePhase(phase: string): Reducer {
  return (snapshot) => {
    if (snapshot.incident.lifecycle === 'finished') return snapshot;
    return { ...snapshot, incident: { ...snapshot.incident, phase } };
  };
}

const handleEvent = reducerFrom({
  alert_received: seedIncident,
  hypothesis_proposed: movePhase('investigating'),
  mitigation_proposed: movePhase('mitigating'),
  budget_exhausted: finish('budget_exhausted'),
  investigation_finished: (snapshot, event) => finish(payloadOf(event, 'investigation_finished').reason)(snapshot, event),
});

export function reduceIncident(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const handled = handleEvent(snapshot, event);
  const illustrative = handled.incident.illustrative || event.payload.illustrative === true;
  const incident = { ...handled.incident, lastActivityAt: event.occurredAt, illustrative };
  return { ...handled, incident, lastSequence: event.sequence };
}
