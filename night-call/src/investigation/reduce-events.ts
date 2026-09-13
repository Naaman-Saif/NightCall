import { withPhase } from './derive-phase';
import { emptySnapshot } from './empty-snapshot';
import type { IncidentEvent } from './event-types';
import { withHeadline } from './headline';
import { reduceBrief } from './reduce-brief';
import { reduceExperiments } from './reduce-experiments';
import { reduceHypotheses } from './reduce-hypotheses';
import { reduceIncident } from './reduce-incident';
import { reduceInvestigation } from './reduce-investigation';
import { reduceMitigation } from './reduce-mitigation';
import { reducePublication } from './reduce-publication';
import { reduceQuestions } from './reduce-questions';
import { reduceRoles } from './reduce-roles';
import { reduceRunSteps } from './reduce-run-steps';
import { withRunReport } from './run-report';
import { reduceVerification } from './reduce-verification';
import type { Reducer } from './reducer';
import type { Snapshot } from './snapshot';

const areaReducers: Reducer[] = [
  reduceIncident,
  reduceInvestigation,
  reduceRoles,
  reduceBrief,
  reduceRunSteps,
  reduceHypotheses,
  reduceQuestions,
  reduceExperiments,
  reduceMitigation,
  reduceVerification,
  reducePublication,
];

function applyEvent(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const reduced = areaReducers.reduce((current, reduceArea) => reduceArea(current, event), snapshot);
  return withHeadline(withRunReport(withPhase(reduced)));
}

export function reduceEvents(events: IncidentEvent[]): Snapshot | null {
  const [first] = events;
  if (first?.type !== 'alert_received') return null;
  return events.reduce(applyEvent, emptySnapshot(first.incidentId));
}

export function incidentIsActive(events: IncidentEvent[]): boolean {
  return reduceEvents(events)?.incident.lifecycle === 'active';
}
