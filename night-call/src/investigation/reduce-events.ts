import { emptySnapshot } from './empty-snapshot';
import type { IncidentEvent } from './event-types';
import { reduceBrief } from './reduce-brief';
import { reduceHypotheses } from './reduce-hypotheses';
import { reduceIncident } from './reduce-incident';
import { reduceQuestions } from './reduce-questions';
import { reduceRoles } from './reduce-roles';
import type { Reducer } from './reducer';
import type { Snapshot } from './snapshot';

const areaReducers: Reducer[] = [reduceIncident, reduceRoles, reduceBrief, reduceHypotheses, reduceQuestions];

function applyEvent(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  return areaReducers.reduce((current, reduceArea) => reduceArea(current, event), snapshot);
}

export function reduceEvents(events: IncidentEvent[]): Snapshot | null {
  const [first] = events;
  if (first?.type !== 'alert_received') return null;
  return events.reduce(applyEvent, emptySnapshot(first.incidentId));
}

export function incidentIsActive(events: IncidentEvent[]): boolean {
  return reduceEvents(events)?.incident.lifecycle === 'active';
}
