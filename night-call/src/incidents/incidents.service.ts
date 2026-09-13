import { Inject, Injectable, Logger } from '@nestjs/common';

import { settings } from '../config/settings';
import type { IncidentEvent } from '../investigation/event-types';
import { openInvestigation } from '../investigation/open-investigation';
import { captureRecipeInBackground } from '../production/recipe-in-background';
import { SeriesKeeper } from '../recorder/series-keeper';
import { investigateInBackground } from '../runtime/background-invoke';
import { alertIsFiring, alertNameOf, factsOf, type AlertPayload } from './alert-payload';

@Injectable()
export class IncidentsService {
  private readonly log = new Logger('Incidents');

  constructor(@Inject(SeriesKeeper) private readonly keeper: SeriesKeeper) {}

  async receive(payload: AlertPayload): Promise<string[]> {
    const firing = payload.alerts.filter(alertIsFiring);
    const opened: IncidentEvent[] = [];
    for (const alert of firing) {
      const event = await openInvestigation(this.keeper.writer, { facts: factsOf(alert), blockDuplicates: true });
      if (event) opened.push(event);
    }
    const ids = opened.map((event) => event.incidentId);
    const names = firing.map(alertNameOf).join(', ');
    this.log.log(`alerts received ${payload.alerts.length}, firing [${names}], opened [${ids.join(', ')}]`);
    if (opened.length > 0) this.keeper.keep();
    opened.forEach((event) => this.startWork(event));
    return ids;
  }

  private startWork(event: IncidentEvent): void {
    const writer = this.keeper.writer;
    const openedAtMs = Date.parse(String(event.payload.startedAt));
    captureRecipeInBackground(this.log, { writer, incidentId: event.incidentId, openedAtMs });
    if (settings.invokeAgentsOnAlert) investigateInBackground(this.log, { writer, incidentId: event.incidentId, trigger: 'alert' });
  }
}
