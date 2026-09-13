import type { IncidentEvent } from './event-types';
import { payloadOf } from './payload-schemas';
import { reducerFrom } from './reducer';
import type { Snapshot } from './snapshot';

function updateBrief(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { summary, knownFacts, unknowns, nextStep } = payloadOf(event, 'brief_updated');
  return { ...snapshot, brief: { summary, knownFacts, unknowns, nextStep, updatedAt: event.occurredAt } };
}

function recordEvidence(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { evidenceId, kind, source, summary, observedAt, excerpt, sourceLinks, crashCounts } = payloadOf(event, 'evidence_recorded');
  const item = { kind, source, summary, observedAt, excerpt, sourceLinks: sourceLinks ?? [], crashCounts: crashCounts ?? null };
  const evidence = { ...snapshot.evidence, [evidenceId]: item };
  return { ...snapshot, evidence };
}

export const reduceBrief = reducerFrom({ brief_updated: updateBrief, evidence_recorded: recordEvidence });
