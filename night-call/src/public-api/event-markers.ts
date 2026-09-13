import type { EventType, IncidentEvent } from '../investigation/event-types';
import { payloadOf } from '../investigation/payload-schemas';
import type { Snapshot } from '../investigation/snapshot';
import { marker, type Marker } from './marker';

export type MarkerSource = { snapshot: Snapshot; events: IncidentEvent[] };

function eventsOf(source: MarkerSource, type: EventType): IncidentEvent[] {
  return source.events.filter((event) => event.type === type);
}

function alarmMarkers(source: MarkerSource): Marker[] {
  const { alertName, startedAt } = source.snapshot.incident;
  return eventsOf(source, 'alert_received').map((event) => marker({ at: startedAt, kind: 'alarm', label: `${alertName} fired`, ref: event.id }));
}

function configChangeMarkers(source: MarkerSource): Marker[] {
  const deploys = eventsOf(source, 'evidence_recorded').map((event) => payloadOf(event, 'evidence_recorded'));
  return deploys
    .filter((evidence) => evidence.kind === 'deploy_history')
    .map((evidence) => marker({ at: evidence.observedAt, kind: 'config_change', label: evidence.summary, ref: evidence.evidenceId }));
}

function answerLabel(snapshot: Snapshot, questionId: string | null): string {
  const question = snapshot.questions.find((asked) => asked.id === questionId);
  return question ? `Answer: ${question.text}` : 'Operator added context';
}

function answerMarkers(source: MarkerSource): Marker[] {
  return eventsOf(source, 'context_supplied').map((event) => {
    const label = answerLabel(source.snapshot, payloadOf(event, 'context_supplied').questionId);
    return marker({ at: event.occurredAt, kind: 'operator_answer', label, ref: event.id });
  });
}

function fixVerifiedMarkers(source: MarkerSource): Marker[] {
  const run = source.snapshot.currentVerificationRun;
  const approvals = eventsOf(source, 'verification_reviewed').filter((event) => {
    const review = payloadOf(event, 'verification_reviewed');
    return review.approved && review.verificationRunId === run?.verificationRunId && review.mitigationId === run.mitigationId;
  });
  return approvals.map((event) => marker({ at: event.occurredAt, kind: 'fix_verified', label: 'Fix verified', ref: event.id }));
}

function pullRequestMarkers(source: MarkerSource): Marker[] {
  const published = eventsOf(source, 'publication_changed').filter((event) => event.payload.state === 'published');
  return published.map((event) => {
    const number = payloadOf(event, 'publication_changed').number;
    const label = number === null ? 'Pull request opened' : `Pull request #${number} opened`;
    return marker({ at: event.occurredAt, kind: 'pr_opened', label, ref: event.id });
  });
}

export function eventMarkers(source: MarkerSource): Marker[] {
  const sources = [alarmMarkers, configChangeMarkers, answerMarkers, fixVerifiedMarkers, pullRequestMarkers];
  return sources.flatMap((markersOf) => markersOf(source));
}
