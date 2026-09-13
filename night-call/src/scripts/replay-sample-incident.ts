import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

import { settings } from '../config/settings';
import type { EventDraft } from '../investigation/event-types';
import { EventWriter } from '../investigation/event-writer';
import { LiveStream } from '../investigation/live-stream';
import { openInvestigation, type AlertFacts } from '../investigation/open-investigation';
import { parsePayload, type PayloadOf } from '../investigation/payload-schemas';
import { retimedDrafts } from '../investigation/sample-times';
import { appendAsService } from '../investigation/service-append';

type SampleEvent = EventDraft & { delayMs: number };

function alertPayloadOf(alert: SampleEvent): PayloadOf<'alert_received'> {
  return parsePayload('alert_received', alert.payload) as PayloadOf<'alert_received'>;
}

function factsFrom(alert: SampleEvent): AlertFacts {
  const { alertName, service, severity, labels } = alertPayloadOf(alert);
  return { alertName, service, severity, labels, summary: alert.summary, illustrative: true };
}

async function replaySample(): Promise<void> {
  const { events } = JSON.parse(readFileSync(settings.sampleIncidentPath, 'utf8')) as { events: SampleEvent[] };
  const [alert, ...rest] = events;
  const writer = new EventWriter(settings.stateDir, new LiveStream());
  const opened = await openInvestigation(writer, { facts: factsFrom(alert), blockDuplicates: false });
  if (!opened) throw new Error('sample incident did not open');
  const clock = { fixtureAlertAt: alertPayloadOf(alert).startedAt, replayAlertAt: String(opened.payload.startedAt) };
  for (const { delayMs, ...draft } of retimedDrafts(rest, clock)) {
    await sleep(delayMs);
    await appendAsService(writer, { incidentId: opened.incidentId, draft });
  }
  console.log(JSON.stringify({ incidentId: opened.incidentId, label: opened.payload.label, events: events.length }));
}

replaySample().catch((error: unknown) => {
  console.error(`replay failed: ${String(error)}`);
  process.exitCode = 1;
});
