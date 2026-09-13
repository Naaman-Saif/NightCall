import type { Phase, Snapshot } from './snapshot';

function reproductionIsRunning(snapshot: Snapshot): boolean {
  return snapshot.experiments.some((experiment) => experiment.kind === 'reproduction' && experiment.finishedAt === null);
}

function publicationHasStarted(snapshot: Snapshot): boolean {
  return snapshot.publication.state === 'publishing' || snapshot.publication.state === 'published';
}

export function phaseOf(snapshot: Snapshot): Phase {
  if (snapshot.incident.lifecycle === 'finished') return 'handoff';
  if (publicationHasStarted(snapshot)) return 'publishing';
  if (snapshot.currentVerificationRun) return 'verifying';
  if (snapshot.mitigation) return 'mitigating';
  if (reproductionIsRunning(snapshot)) return 'reproducing';
  return snapshot.hypotheses.length > 0 ? 'investigating' : 'briefing';
}

export function withPhase(snapshot: Snapshot): Snapshot {
  return { ...snapshot, incident: { ...snapshot.incident, phase: phaseOf(snapshot) } };
}
