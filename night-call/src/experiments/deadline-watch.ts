import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { EventWriter } from '../investigation/event-writer';
import { allSnapshots } from '../investigation/incident-catalog';
import { appendAsService } from '../investigation/service-append';
import type { Snapshot } from '../investigation/snapshot';

const CHECK_EVERY_MS = 10_000;

export function expiredIncidents(stateDir: string, nowMs: number): Snapshot[] {
  return allSnapshots(stateDir).filter(({ incident }) => {
    const deadlineMs = Date.parse(incident.deadlineAt);
    return incident.lifecycle === 'active' && Number.isFinite(deadlineMs) && deadlineMs <= nowMs;
  });
}

export async function closeExpiredIncident(writer: EventWriter, snapshot: Snapshot): Promise<void> {
  const { id, deadlineAt } = snapshot.incident;
  const summary = 'Time budget used up: tools are closed, the test copy is removed and no pull request is opened';
  const draft = { actor: 'system' as const, type: 'budget_exhausted' as const, summary, refs: [], payload: { deadlineAt } };
  await appendAsService(writer, { incidentId: id, draft });
}

@Injectable()
export class DeadlineWatch {
  private readonly log = new Logger('DeadlineWatch');

  constructor(@Inject(EventWriter) private readonly writer: EventWriter) {}

  @Interval(CHECK_EVERY_MS)
  async closeExpired(): Promise<void> {
    for (const snapshot of expiredIncidents(this.writer.stateDir, Date.now())) {
      await closeExpiredIncident(this.writer, snapshot)
        .then(() => this.log.log(`budget exhausted for ${snapshot.incident.id} at ${snapshot.incident.deadlineAt}`))
        .catch((error: unknown) => this.log.error(`budget close failed for ${snapshot.incident.id}: ${String(error)}`));
    }
  }
}
