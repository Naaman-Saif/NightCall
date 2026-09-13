import type { IncidentEvent } from './event-types';
import { payloadOf, type PayloadOf } from './payload-schemas';
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
    const incident = { ...snapshot.incident, lifecycle: 'finished' as const, completionReason: reason };
    return { ...snapshot, incident };
  };
}

const COMPLETION_BY_STOP: Record<PayloadOf<'investigation_stopped'>['reason'], CompletionReason> = {
  answer_recorded: 'completed',
  no_answer: 'completed',
  error: 'infrastructure_failure',
};

const handleEvent = reducerFrom({
  alert_received: seedIncident,
  budget_exhausted: finish('budget_exhausted'),
  investigation_finished: (snapshot, event) => finish(payloadOf(event, 'investigation_finished').reason)(snapshot, event),
  investigation_stopped: (snapshot, event) => finish(COMPLETION_BY_STOP[payloadOf(event, 'investigation_stopped').reason])(snapshot, event),
});

export function reduceIncident(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const handled = handleEvent(snapshot, event);
  const illustrative = handled.incident.illustrative || event.payload.illustrative === true;
  const incident = { ...handled.incident, lastActivityAt: event.occurredAt, illustrative };
  return { ...handled, incident, lastSequence: event.sequence };
}
