import { Inject, Injectable, Logger } from '@nestjs/common';

import { settings } from '../config/settings';
import { openInvestigation } from '../investigation/open-investigation';
import { SeriesKeeper } from '../recorder/series-keeper';
import { investigateInBackground } from '../runtime/background-invoke';
import { alertIsFiring, alertNameOf, factsOf, type AlertPayload } from './alert-payload';

@Injectable()
export class IncidentsService {
  private readonly log = new Logger('Incidents');

  constructor(@Inject(SeriesKeeper) private readonly keeper: SeriesKeeper) {}

  async receive(payload: AlertPayload): Promise<string[]> {
    const firing = payload.alerts.filter(alertIsFiring);
    const opened: string[] = [];
    for (const alert of firing) {
      const event = await openInvestigation(this.keeper.writer, { facts: factsOf(alert), blockDuplicates: true });
      if (event) opened.push(event.incidentId);
    }
    const names = firing.map(alertNameOf).join(', ');
    this.log.log(`alerts received ${payload.alerts.length}, firing [${names}], opened [${opened.join(', ')}]`);
    if (opened.length > 0) this.keeper.keep();
    if (settings.invokeAgentsOnAlert) opened.forEach((incidentId) => investigateInBackground(this.log, incidentId));
    return opened;
  }
}
