import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';

import { alertIsFiring, type AlertPayload } from './alert-payload';
import { openIncidentFor, type Incident, type IncidentStatus } from './incident';
import { IncidentStore } from './incident-store';

export const INCIDENT_STORE = 'INCIDENT_STORE';

@Injectable()
export class LegacyIncidentQueue implements OnModuleInit {
  constructor(@Inject(INCIDENT_STORE) private readonly store: IncidentStore) {}

  onModuleInit(): void {
    for (const incident of this.store.all().filter((i) => i.status === 'running')) this.store.setStatus(incident.id, 'open');
  }

  receive(payload: AlertPayload): Incident[] {
    const opened: Incident[] = [];
    for (const alert of payload.alerts.filter(alertIsFiring)) {
      const incident = openIncidentFor(alert, [...this.store.all(), ...opened]);
      if (!incident) continue;
      this.store.add(incident);
      opened.push(incident);
    }
    return opened;
  }

  nextOpen(): Incident | undefined {
    return this.store.all().find((incident) => incident.status === 'open');
  }

  setStatus(id: string, status: IncidentStatus): void {
    this.store.setStatus(id, status);
  }
}
