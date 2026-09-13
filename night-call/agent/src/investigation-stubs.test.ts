import type { Cause } from './cause-rules.js';
import { newLedger } from './evidence-ledger.js';
import type { IncidentApi, ReaderReply } from './incident-api.js';
import type { InvestigationParts } from './investigation.js';
import type { Lead } from './lead-steps.js';
import type { ProgressEvent } from './progress.js';
import { stubProof, type ProofOptions } from './proof-stub.test.js';
import { ToolAnswerError } from './tool-client.js';

export type Recorded = { steps: string[]; events: ProgressEvent[] };
export type StubOptions = ProofOptions & { causes?: Cause[]; errorShare?: number | null; failingReaders?: string[]; proposeFails?: boolean; fallbackOn?: string[] };

export const GOOD_CAUSES: Cause[] = [
  {
    claim: 'The recommendation cache grows until memory reaches the 500 MiB limit and the service runs out of memory.',
    supportingEvidenceIds: ['ev-memory-1', 'ev-oom-events-1', 'ev-deploy-history-1'],
    contradictingEvidenceIds: [],
    confirmWith: 'Turn the cache flag off in a test copy and check memory stays flat.',
  },
  { claim: 'CPU pressure slows recommendation responses.', supportingEvidenceIds: ['ev-cpu-1'], contradictingEvidenceIds: ['ev-traces-1'], confirmWith: 'Profile CPU under load.' },
];

const SUMMARIES: Record<string, string> = {
  'failure-rate': 'Recommendation requests failing: 12.30% over the last 10 minutes',
  'oom-events': '4 out-of-memory events, 4 exits and 4 starts for recommendation in the last 10 minutes',
  memory: 'recommendation memory latest 480 MiB, peak 500 MiB, limit 500 MiB (180 samples over 30 minutes)',
  cpu: 'recommendation cpu latest 20.1%, peak 41.5% (180 samples over 30 minutes)',
  logs: '200 log lines from recommendation in the last 30 minutes',
  traces: '3 error spans in 40 traces from recommendation in the last 30 minutes',
  'deploy-history': 'Flag file changed in 84d1eb7: release: enable recommendation cache',
  'flag-state': 'recommendationCacheFailure is on in the live flag file, changed at 17:54 UTC, not committed to nightcall-demo',
};

function dataFor(reader: string, errorShare: number | null): unknown {
  if (reader === 'failure-rate') return { spans: [{ service: 'frontend', errorShare: 0.0271, callsPerSecond: 1.7740707887577989 }, { service: 'recommendation', errorShare }] };
  if (reader === 'oom-events') return { events: [1, 2, 3, 4].flatMap(() => [{ action: 'oom' }, { action: 'die' }, { action: 'start' }]) };
  return {};
}

function stubApi(recorded: Recorded, options: StubOptions): IncidentApi {
  const errorShare = 'errorShare' in options ? (options.errorShare ?? null) : 0.123;
  return {
    read: async (reader) => {
      recorded.steps.push(`read ${reader}`);
      if (options.failingReaders?.includes(reader)) throw new ToolAnswerError(reader === 'flag-state' ? 404 : 502);
      return { evidence: { evidenceId: `ev-${reader}-1`, kind: reader, summary: SUMMARIES[reader], excerpt: '' }, data: dataFor(reader, errorShare) } as ReaderReply;
    },
    postEvent: async (event) => {
      recorded.steps.push(event.type === 'role_status_changed' ? `now: ${String(event.payload.assignment)}` : `post ${event.type}`);
      recorded.events.push(event);
    },
    waitForAnswers: async () => [],
    readCase: async () => ({}),
  };
}

function stubLead(recorded: Recorded, options: StubOptions): Lead {
  return {
    proposeCauses: async (request) => {
      recorded.steps.push('propose causes');
      if (options.fallbackOn?.includes('causes')) request.onFallback();
      if (options.proposeFails) throw new Error('Stream ended without completing a message');
      return options.causes ?? GOOD_CAUSES;
    },
    classify: async (request) => {
      recorded.steps.push('classify');
      if (options.fallbackOn?.includes('classify')) request.onFallback();
      return { urgency: 'tolerable', reason: 'They can wait.' };
    },
  };
}

export function stubInvestigation(answerText: string | null, options: StubOptions = {}): Recorded & { parts: InvestigationParts } {
  const recorded: Recorded = { steps: [], events: [] };
  const waitForAnswer = async () => {
    recorded.steps.push('wait for answer');
    await Promise.resolve();
    return answerText === null ? null : { questionId: 'q-impact', text: answerText, suppliedAt: '2026-09-13T20:00:00Z' };
  };
  const proof = stubProof(recorded, options);
  const parts: InvestigationParts = { api: stubApi(recorded, options), ledger: newLedger(), lead: stubLead(recorded, options), proof, waitForAnswer };
  return { ...recorded, parts };
}
