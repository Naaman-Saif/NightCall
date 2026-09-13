import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { EventWriter } from './event-writer';
import { LiveStream } from './live-stream';
import { openInvestigation, type AlertFacts } from './open-investigation';

export const recommendationFacts: AlertFacts = {
  alertName: 'RecommendationRestarted',
  service: 'recommendation',
  severity: 'critical',
  summary: 'Recommendation restarted',
  labels: { service: 'recommendation', alertname: 'RecommendationRestarted' },
  illustrative: false,
};

export const impactQuestion = {
  questionId: 'q-impact',
  text: 'Recommendations are failing on about 1 in 100 requests. Is that tolerable while I test a fix?',
  whyItMatters: 'It decides whether to rush the safest fix',
  meanwhile: 'Reproducing in the sandbox',
  blocks: 'none',
};

export function freshWriter(stream = new LiveStream()): EventWriter {
  return new EventWriter(mkdtempSync(join(tmpdir(), 'night-call-')), stream);
}

export async function openIncident(writer: EventWriter): Promise<string> {
  const event = await openInvestigation(writer, { facts: recommendationFacts, blockDuplicates: false });
  return String(event?.incidentId);
}

export function toolBody(type: string, payload: Record<string, unknown>): Record<string, unknown> {
  return { type, summary: `${type} posted`, refs: [], payload };
}
