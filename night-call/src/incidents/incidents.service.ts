import { Inject, Injectable, Logger } from '@nestjs/common';

import { settings } from '../config/settings';
import { EventWriter } from '../investigation/event-writer';
import { openInvestigation } from '../investigation/open-investigation';
import { invokeAgents } from '../runtime/runtime-invoker';
import { alertIsFiring, factsOf, type AlertPayload } from './alert-payload';

@Injectable()
export class IncidentsService {
  private readonly log = new Logger('Incidents');

  constructor(@Inject(EventWriter) private readonly writer: EventWriter) {}

  async receive(payload: AlertPayload): Promise<string[]> {
    const opened: string[] = [];
    for (const alert of payload.alerts.filter(alertIsFiring)) {
      const event = await openInvestigation(this.writer, { facts: factsOf(alert), blockDuplicates: true });
      if (event) opened.push(event.incidentId);
    }
    if (settings.invokeAgentsOnAlert) opened.forEach((incidentId) => this.invoke(incidentId));
    return opened;
  }

  private invoke(incidentId: string): void {
    invokeAgents({ incidentId, mode: 'hello' })
      .then((outcome) => this.log.log(`agents invoked for ${incidentId}: ${outcome.statusCode}`))
      .catch((error: unknown) => this.log.error(`agent invoke failed for ${incidentId}: ${String(error)}`));
  }
}
