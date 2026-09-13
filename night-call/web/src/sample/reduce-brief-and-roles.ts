import type { IncidentEvent, Snapshot } from '../api/contract';
import { reducerFrom } from './reducer-table';

function updateBrief(snapshot: Snapshot, event: IncidentEvent<'brief_updated'>): Snapshot {
  const { summary, knownFacts, unknowns, nextStep } = event.payload;
  return { ...snapshot, brief: { summary, knownFacts, unknowns, nextStep, updatedAt: event.occurredAt } };
}

function updateRole(snapshot: Snapshot, event: IncidentEvent<'role_status_changed'>): Snapshot {
  const { role, status, assignment } = event.payload;
  const roles = { ...snapshot.roles, [role]: { status, assignment, updatedAt: event.occurredAt } };
  return { ...snapshot, roles };
}

export const reduceBriefAndRoles = reducerFrom({ brief_updated: updateBrief, role_status_changed: updateRole });
