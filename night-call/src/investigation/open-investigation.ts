import type { EventDraft, IncidentEvent } from './event-types';
import type { EventWriter } from './event-writer';
import { allSnapshots } from './incident-catalog';
import { nextLabel } from './label-counter';

const BUDGET_MS = 30 * 60 * 1000;

export type AlertFacts = {
  alertName: string;
  service: string;
  severity: string;
  summary: string;
  labels: Record<string, string>;
  illustrative: boolean;
};

export type OpenRequest = { facts: AlertFacts; blockDuplicates: boolean };

function activeDuplicateExists(stateDir: string, facts: AlertFacts): boolean {
  return allSnapshots(stateDir).some(({ incident }) => incident.lifecycle === 'active' && incident.service === facts.service);
}

function alertDraft(facts: AlertFacts, label: string): EventDraft {
  const receivedAt = Date.now();
  const timing = {
    startedAt: new Date(receivedAt).toISOString(),
    deadlineAt: new Date(receivedAt + BUDGET_MS).toISOString(),
  };
  const { alertName, service, severity, labels } = facts;
  const illustrative = facts.illustrative ? { illustrative: true } : {};
  const payload = { label, alertName, service, severity, ...timing, labels, ...illustrative };
  return { actor: 'system', type: 'alert_received', summary: facts.summary, refs: [], payload };
}

export function openInvestigation(writer: EventWriter, request: OpenRequest): Promise<IncidentEvent | null> {
  return writer.queue.run('open', () => {
    if (request.blockDuplicates && activeDuplicateExists(writer.stateDir, request.facts)) return null;
    const label = nextLabel(writer.stateDir);
    return writer.update(label.toLowerCase(), () => alertDraft(request.facts, label));
  });
}
