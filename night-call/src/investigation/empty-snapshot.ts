import type { IncidentFacts, RoleState, Snapshot } from './snapshot';

const readyRole: RoleState = { status: 'ready', assignment: '', updatedAt: null };

const emptyPublication: Snapshot['publication'] = {
  state: 'not_eligible',
  repository: null,
  baseBranch: null,
  number: null,
  url: null,
  diff: null,
  failureReason: null,
};

const emptyAreas: Omit<Snapshot, 'incident'> = {
  headline: '',
  investigation: 'not_started',
  brief: null,
  roles: { lead: readyRole, investigator: readyRole, verifier: readyRole },
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
  publication: emptyPublication,
  lastSequence: 0,
};

const emptyIncident: Omit<IncidentFacts, 'id'> = {
  label: '',
  service: '',
  alertName: '',
  severity: '',
  startedAt: '',
  lastActivityAt: '',
  deadlineAt: '',
  illustrative: false,
  lifecycle: 'active',
  phase: 'briefing',
  attention: 'none',
  completionReason: null,
};

export function emptySnapshot(incidentId: string): Snapshot {
  return { incident: { id: incidentId, ...emptyIncident }, ...emptyAreas };
}
