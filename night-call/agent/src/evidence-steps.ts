import { evidenceBrief } from './answer-brief.js';
import { noteReading } from './evidence-ledger.js';
import { readImpact } from './impact-readings.js';
import type { ReaderName, ReaderQuery } from './incident-api.js';
import { runStep, type RunContext } from './run-steps.js';
import { impactQuestionEvent } from './urgency.js';

export const INVESTIGATED_SERVICE = 'recommendation';
const LOOK_BACK = { service: INVESTIGATED_SERVICE, minutes: 30 };

type EvidenceRead = { nowDoing: string; skipLabel: string; reader: ReaderName; query: ReaderQuery };

export const EVIDENCE_READS: EvidenceRead[] = [
  { nowDoing: 'Reading memory before each crash', skipLabel: 'reading memory', reader: 'memory', query: LOOK_BACK },
  { nowDoing: 'Reading CPU', skipLabel: 'reading CPU', reader: 'cpu', query: LOOK_BACK },
  { nowDoing: 'Reading logs', skipLabel: 'reading logs', reader: 'logs', query: { ...LOOK_BACK, tail: 200 } },
  { nowDoing: 'Reading traces', skipLabel: 'reading traces', reader: 'traces', query: LOOK_BACK },
  { nowDoing: 'Reading deploy history', skipLabel: 'reading deploy history', reader: 'deploy-history', query: {} },
];

export async function askImpact(context: RunContext): Promise<boolean> {
  const readings = await runStep(context, {
    nowDoing: 'Reading the failure rate and crashes',
    skipLabel: 'reading the failure rate and crashes',
    work: () => readImpact(context, INVESTIGATED_SERVICE),
  });
  const asked = await runStep(context, {
    nowDoing: 'Asking about customer impact',
    skipLabel: 'asking about customer impact',
    work: async () => {
      await context.api.postEvent(impactQuestionEvent(readings ?? { failure: null, crashes: null }));
      return true;
    },
  });
  return asked === true;
}

async function readOne(context: RunContext, read: EvidenceRead): Promise<void> {
  const reply = await context.api.read(read.reader, read.query);
  noteReading(context.ledger, { reader: read.reader, reply });
}

export async function readEvidence(context: RunContext): Promise<void> {
  for (const read of EVIDENCE_READS) {
    await runStep(context, { nowDoing: read.nowDoing, skipLabel: read.skipLabel, work: () => readOne(context, read) });
  }
  const work = () => context.api.postEvent(evidenceBrief(context.ledger));
  await runStep(context, { nowDoing: 'Summarising the readings', skipLabel: 'posting the summary of readings', work });
}
