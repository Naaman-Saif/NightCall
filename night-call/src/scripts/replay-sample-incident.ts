import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

import { settings } from '../config/settings';
import type { EventDraft } from '../investigation/event-types';
import { EventWriter } from '../investigation/event-writer';
import { LiveStream } from '../investigation/live-stream';
import { openInvestigation, type AlertFacts } from '../investigation/open-investigation';
import { parsePayload, type PayloadOf } from '../investigation/payload-schemas';
import { appendAsService } from '../investigation/service-append';

type SampleEvent = EventDraft & { delayMs: number };

function factsFrom(alert: SampleEvent): AlertFacts {
  const payload = parsePayload('alert_received', alert.payload) as PayloadOf<'alert_received'>;
  const { alertName, service, severity, labels } = payload;
  return { alertName, service, severity, labels, summary: alert.summary, illustrative: true };
}

async function replaySample(): Promise<void> {
  const { events } = JSON.parse(readFileSync(settings.sampleIncidentPath, 'utf8')) as { events: SampleEvent[] };
  const [alert, ...rest] = events;
  const writer = new EventWriter(settings.stateDir, new LiveStream());
  const opened = await openInvestigation(writer, { facts: factsFrom(alert), blockDuplicates: false });
  if (!opened) throw new Error('sample incident did not open');
  for (const { delayMs, ...draft } of rest) {
    await sleep(delayMs);
    await appendAsService(writer, { incidentId: opened.incidentId, draft });
  }
  console.log(JSON.stringify({ incidentId: opened.incidentId, label: opened.payload.label, events: events.length }));
}

replaySample().catch((error: unknown) => {
  console.error(`replay failed: ${String(error)}`);
  process.exitCode = 1;
});
