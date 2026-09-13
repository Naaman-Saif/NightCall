import type { Snapshot } from './snapshot';

export function minutesLeftAt(deadlineAt: string, nowMs: number): number {
  return Math.max(0, Math.floor((Date.parse(deadlineAt) - nowMs) / 60_000));
}

function caseIncident(snapshot: Snapshot, nowMs: number) {
  const { id, label, service, alertName, startedAt, deadlineAt, lifecycle, phase, attention } = snapshot.incident;
  return { id, label, service, alertName, startedAt, deadlineAt, minutesLeft: minutesLeftAt(deadlineAt, nowMs), lifecycle, phase, attention };
}

export function agentCaseOf(snapshot: Snapshot, nowMs: number) {
  const evidence = Object.entries(snapshot.evidence).map(([evidenceId, item]) => {
    return { evidenceId, kind: item.kind, summary: item.summary, observedAt: item.observedAt };
  });
  const hypotheses = snapshot.hypotheses.map(({ id, claim, status, reason }) => ({ hypothesisId: id, claim, status, reason }));
  const questions = snapshot.questions.map(({ id, text, blocks, askedAt, answer }) => ({ questionId: id, text, blocks, askedAt, answer }));
  return {
    incident: caseIncident(snapshot, nowMs),
    headline: snapshot.headline,
    investigation: snapshot.investigation,
    brief: snapshot.brief,
    roles: snapshot.roles,
    evidence,
    hypotheses,
    questions,
    context: snapshot.context,
    lastSequence: snapshot.lastSequence,
  };
}
