import type { EventType, Role } from './event-types';

const writableByRole: Record<Role, ReadonlySet<EventType>> = {
  lead: new Set<EventType>([
    'brief_updated',
    'hypothesis_proposed',
    'hypothesis_status_changed',
    'question_asked',
    'role_status_changed',
    'investigation_stopped',
  ]),
  investigator: new Set<EventType>(['hypothesis_status_changed', 'role_status_changed']),
  verifier: new Set<EventType>(['experiment_reviewed', 'verification_reviewed', 'role_status_changed']),
};

export function roleMayWrite(role: Role, type: EventType): boolean {
  return writableByRole[role].has(type);
}
