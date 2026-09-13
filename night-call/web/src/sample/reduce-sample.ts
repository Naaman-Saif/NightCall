import type { IncidentEvent, Snapshot } from '../api/contract';
import { openSnapshot } from './open-snapshot';
import { attentionFor, withContext, withQuestion } from './reduce-questions';
import { withPhase } from './reduce-phase';

export function reduceSample(events: IncidentEvent[]): Snapshot | null {
  return events.reduce<Snapshot | null>(applyEvent, null);
}

function applyEvent(snapshot: Snapshot | null, event: IncidentEvent): Snapshot | null {
  if (event.type === 'alert_received') return openSnapshot(event);
  if (!snapshot) return null;
  const next = applyArea(snapshot, event);
  const illustrative = next.incident.illustrative || Boolean(event.payload.illustrative);
  const incident = { ...next.incident, lastActivityAt: event.occurredAt, illustrative, attention: attentionFor(next) };
  return { ...next, incident, lastSequence: event.sequence };
}

function applyArea(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  switch (event.type) {
    case 'brief_updated':
      return { ...snapshot, brief: { ...event.payload, updatedAt: event.occurredAt } };
    case 'role_status_changed':
      return withRole(snapshot, event);
    case 'question_asked':
      return withQuestion(snapshot, event);
    case 'context_supplied':
      return withContext(snapshot, event);
    default:
      return withPhase(snapshot, event);
  }
}

function withRole(snapshot: Snapshot, event: IncidentEvent<'role_status_changed'>): Snapshot {
  const { role, status, assignment } = event.payload;
  const roles = { ...snapshot.roles, [role]: { status, assignment, updatedAt: event.occurredAt } };
  return { ...snapshot, roles };
}
