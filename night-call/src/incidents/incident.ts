import { randomUUID } from 'node:crypto';

import { alertNameOf, serviceOf, type Alert } from './alert-payload';

export type IncidentStatus = 'open' | 'running' | 'closed';

export interface IncidentAlert {
  name: string;
  service: string;
  firedAt: string;
  summary: string;
}

export interface Incident {
  id: string;
  key: string;
  alert: IncidentAlert;
  status: IncidentStatus;
  receivedAt: string;
}

export function incidentKeyOf(alert: Alert): string {
  return `${serviceOf(alert)}/${alertNameOf(alert)}`;
}

export function incidentFrom(alert: Alert): Incident {
  return {
    id: randomUUID(),
    key: incidentKeyOf(alert),
    alert: {
      name: alertNameOf(alert),
      service: serviceOf(alert),
      firedAt: alert.startsAt,
      summary: alert.annotations.summary ?? '',
    },
    status: 'open',
    receivedAt: new Date().toISOString(),
  };
}

export function incidentBlocksNewOnes(incident: Incident): boolean {
  return incident.status === 'open' || incident.status === 'running';
}

export function openIncidentFor(alert: Alert, existing: Incident[]): Incident | undefined {
  const key = incidentKeyOf(alert);
  const blocked = existing.filter(incidentBlocksNewOnes).some((incident) => incident.key === key);
  return blocked ? undefined : incidentFrom(alert);
}
