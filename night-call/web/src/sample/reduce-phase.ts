import type { Incident, IncidentEvent, Phase, Snapshot } from '../api/contract';

export function withPhase(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const completionReason = completionReasonOf(event);
  if (!completionReason) {
    const incident: Incident = { ...snapshot.incident, phase: phaseAfter(snapshot.incident.phase, event) };
    return { ...snapshot, incident };
  }
  const incident: Incident = { ...snapshot.incident, phase: 'handoff', lifecycle: 'finished', completionReason };
  return { ...snapshot, incident };
}

function phaseAfter(current: Phase, event: IncidentEvent): Phase {
  switch (event.type) {
    case 'hypothesis_proposed':
      return current === 'briefing' ? 'investigating' : current;
    case 'experiment_started':
      return event.payload.kind === 'reproduction' ? 'reproducing' : current;
    case 'experiment_finished':
      return current === 'reproducing' ? 'investigating' : current;
    case 'mitigation_proposed':
      return 'mitigating';
    case 'verification_started':
    case 'cycle_started':
      return 'verifying';
    case 'publication_changed':
      return event.payload.state === 'publishing' ? 'publishing' : current;
    default:
      return current;
  }
}

function completionReasonOf(event: IncidentEvent): Incident['completionReason'] {
  if (event.type === 'budget_exhausted') return 'budget_exhausted';
  if (event.type === 'investigation_finished') return event.payload.reason;
  return null;
}
