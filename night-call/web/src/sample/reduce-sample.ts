import type { IncidentEvent, Snapshot } from '../api/contract';
import { openSnapshot } from './open-snapshot';
import { reduceBriefAndRoles } from './reduce-brief-and-roles';
import { reduceEvidenceAndHypotheses } from './reduce-evidence';
import { reduceExperiments } from './reduce-experiments';
import { withPhase } from './reduce-phase';
import { reduceProof } from './reduce-proof';
import { reducePublication } from './reduce-publication';
import { attentionFor, reduceQuestions } from './reduce-questions';
import type { AreaReducer } from './reducer-table';

const areaReducers: AreaReducer[] = [
  reduceBriefAndRoles,
  reduceQuestions,
  reduceEvidenceAndHypotheses,
  reduceExperiments,
  reduceProof,
  reducePublication,
  withPhase,
];

export function reduceSample(events: IncidentEvent[]): Snapshot | null {
  return events.reduce<Snapshot | null>(applyEvent, null);
}

function applyEvent(snapshot: Snapshot | null, event: IncidentEvent): Snapshot | null {
  if (event.type === 'alert_received') return openSnapshot(event);
  if (!snapshot) return null;
  const next = areaReducers.reduce((current, reduceArea) => reduceArea(current, event), snapshot);
  const illustrative = next.incident.illustrative || Boolean(event.payload.illustrative);
  const incident = { ...next.incident, lastActivityAt: event.occurredAt, illustrative, attention: attentionFor(next) };
  return { ...next, incident, lastSequence: event.sequence };
}
