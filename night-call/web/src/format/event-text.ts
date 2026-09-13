import type { EventType, IncidentEvent } from '../api/contract';

const EVENT_LABEL: Record<EventType, string> = {
  alert_received: 'Alarm received',
  brief_updated: 'Summary updated',
  evidence_recorded: 'Evidence gathered',
  hypothesis_proposed: 'Cause proposed',
  hypothesis_status_changed: 'Cause re-evaluated',
  question_asked: 'Question asked',
  context_supplied: 'Operator answered',
  contract_recorded: 'Checks defined',
  experiment_started: 'Experiment started',
  experiment_progress: 'Experiment progress',
  experiment_finished: 'Experiment finished',
  experiment_reviewed: 'Experiment reviewed',
  mitigation_proposed: 'Mitigation proposed',
  verification_started: 'Verification started',
  cycle_started: 'Verification round started',
  cycle_finished: 'Verification round finished',
  verification_reviewed: 'Verification reviewed',
  publication_changed: 'Pull request updated',
  role_status_changed: 'Status changed',
  budget_exhausted: 'Time budget used up',
  investigation_finished: 'Investigation finished',
};

export function describeEventType(type: EventType): string {
  return EVENT_LABEL[type] ?? 'Update';
}

export function isReportEvent(event: IncidentEvent): boolean {
  return event.type !== 'role_status_changed';
}
