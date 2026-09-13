import { newLedger } from './evidence-ledger.js';
import type { IncidentApi } from './incident-api.js';
import type { InvestigationParts } from './investigation.js';
import type { BriefDraft, Lead } from './lead-steps.js';
import type { ProgressEvent } from './progress.js';

export type Recorded = { steps: string[]; events: ProgressEvent[] };

export const GOOD_DRAFT: BriefDraft = {
  summary: 'Recommendations fail while memory climbs.',
  knownFacts: [{ text: 'About 12 in 100 requests fail', evidenceIds: ['ev-logs-1'] }],
  unknowns: ['Why memory keeps growing'],
  nextDetail: 'Memory is checked first.',
};

function stubApi(recorded: Recorded): IncidentApi {
  return {
    read: async (reader) => {
      recorded.steps.push(`read ${reader}`);
      return { evidence: { evidenceId: 'ev-logs-1', kind: 'logs', summary: 'failing', excerpt: '' }, data: { spans: [{ errorShare: 0.123 }] } };
    },
    postEvent: async (event) => {
      recorded.steps.push(`post ${event.type}`);
      recorded.events.push(event);
    },
    waitForAnswers: async () => [],
    readCase: async () => ({}),
  };
}

function stubLead(recorded: Recorded, draft: BriefDraft): Lead {
  const step = <Result>(name: string, result: Result) => async () => (recorded.steps.push(name), result);
  return {
    writeFirstBrief: step('first brief', undefined),
    keepReading: (signal) => new Promise((resolve) => {
      recorded.steps.push('keep reading');
      signal.addEventListener('abort', () => resolve(void recorded.steps.push('reading stopped')));
    }),
    classify: step('classify', { urgency: 'tolerable' as const, reason: 'They can wait.' }),
    draftBrief: step('draft brief', draft),
  };
}

export function stubInvestigation(answerText: string | null, draft: BriefDraft = GOOD_DRAFT): Recorded & { parts: InvestigationParts } {
  const recorded: Recorded = { steps: [], events: [] };
  const waitForAnswer = async () => {
    recorded.steps.push('wait for answer');
    await new Promise((resolve) => setImmediate(resolve));
    return answerText === null ? null : { questionId: 'q-impact', text: answerText, suppliedAt: '2026-09-13T20:00:00Z' };
  };
  const parts = { api: stubApi(recorded), ledger: newLedger(), lead: stubLead(recorded, draft), waitForAnswer };
  return { ...recorded, parts };
}
