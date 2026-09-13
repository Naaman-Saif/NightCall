import { allSnapshots } from '../investigation/incident-catalog';
import type { Snapshot } from '../investigation/snapshot';

function summaryOf({ incident, reproduction, publication }: Snapshot) {
  const { id, label, service, alertName, startedAt, lifecycle, attention, phase, illustrative } = incident;
  return { id, label, service, alertName, startedAt, lifecycle, attention, phase, reproduction, publication, illustrative };
}

export type IncidentSummary = ReturnType<typeof summaryOf>;

export function incidentSummaries(stateDir: string): IncidentSummary[] {
  return allSnapshots(stateDir)
    .map(summaryOf)
    .sort((first, second) => second.startedAt.localeCompare(first.startedAt));
}
