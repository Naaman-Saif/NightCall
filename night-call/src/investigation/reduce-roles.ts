import type { IncidentEvent } from './event-types';
import { payloadOf } from './payload-schemas';
import { reducerFrom } from './reducer';
import type { Snapshot } from './snapshot';

function startRoles(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const ready = { status: 'ready' as const, assignment: '', updatedAt: event.occurredAt };
  return { ...snapshot, roles: { lead: ready, investigator: ready, verifier: ready } };
}

function changeRole(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { role, status, assignment } = payloadOf(event, 'role_status_changed');
  const roles = { ...snapshot.roles, [role]: { status, assignment, updatedAt: event.occurredAt } };
  return { ...snapshot, roles };
}

export const reduceRoles = reducerFrom({ alert_received: startRoles, role_status_changed: changeRole });
