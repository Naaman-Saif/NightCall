import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { EventType } from './event-types';
import { payloadSchemas } from './payload-schemas';

type SampleEvent = { type: EventType; payload: unknown };

const samplePath = join(__dirname, '..', '..', 'web', 'public', 'fixtures', 'sample-incident.json');
const sample = JSON.parse(readFileSync(samplePath, 'utf8')) as { events: SampleEvent[] };

const question = { questionId: 'q-1', text: 'Tolerable?', whyItMatters: 'Fix order', meanwhile: 'Testing', blocks: 'none' };

describe('payload schemas', () => {
  it('accepts every event in the sample incident', () => {
    const refused = sample.events.filter((event) => !payloadSchemas[event.type].safeParse(event.payload).success);
    expect(refused.map((event) => event.type)).toEqual([]);
  });

  it('rejects unknown fields at the top level and inside nested objects', () => {
    expect(payloadSchemas.question_asked.safeParse({ ...question, extra: 1 }).success).toBe(false);
    const brief = { summary: 's', knownFacts: [{ text: 't', evidenceIds: [], extra: 1 }], unknowns: [], nextStep: 'n' };
    expect(payloadSchemas.brief_updated.safeParse(brief).success).toBe(false);
  });

  it('allows illustrative true and nothing else', () => {
    expect(payloadSchemas.question_asked.safeParse({ ...question, illustrative: true }).success).toBe(true);
    expect(payloadSchemas.question_asked.safeParse({ ...question, illustrative: false }).success).toBe(false);
  });

  it('keeps experiment counts and pacing inside the agreed bounds', () => {
    const recipe = { flagVariant: 'on', restart: true, count: 40, pacingMs: 200, stopOnFailure: true };
    const experiment = { experimentId: 'e', kind: 'reproduction', hypothesisId: 'h', contractId: 'c', purpose: 'p', recipe };
    expect(payloadSchemas.experiment_started.safeParse(experiment).success).toBe(false);
  });
});
