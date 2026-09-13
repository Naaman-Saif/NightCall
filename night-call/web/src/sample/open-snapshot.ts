import type { Incident, IncidentEvent, RoleState, Snapshot } from '../api/contract';

type AlertEvent = IncidentEvent<'alert_received'>;

const untouchedAreas = {
  brief: null,
  evidence: {},
  hypotheses: [],
  questions: [],
  context: [],
  contract: null,
  experiments: [],
  reproduction: 'untested',
  mitigation: null,
  supersededMitigations: [],
  currentVerificationRun: null,
  cycles: [],
  verification: null,
  publication: { state: 'not_eligible', repository: null, baseBranch: null, number: null, url: null, diff: null, failureReason: null },
} satisfies Omit<Snapshot, 'incident' | 'roles' | 'lastSequence'>;

function incidentFromAlert(event: AlertEvent): Incident {
  const { label, service, alertName, severity, startedAt, deadlineAt, illustrative } = event.payload;
  return {
    id: event.incidentId,
    label,
    service,
    alertName,
    severity,
    startedAt,
    deadlineAt,
    lastActivityAt: event.occurredAt,
    illustrative: Boolean(illustrative),
    lifecycle: 'active',
    phase: 'briefing',
    attention: 'none',
    completionReason: null,
  };
}

export function openSnapshot(event: AlertEvent): Snapshot {
  const ready: RoleState = { status: 'ready', assignment: '', updatedAt: event.occurredAt };
  return {
    ...untouchedAreas,
    incident: incidentFromAlert(event),
    roles: { lead: ready, investigator: ready, verifier: ready },
    lastSequence: event.sequence,
  };
}
