import type { IncidentEvent } from './event-types';
import { payloadOf } from './payload-schemas';
import { publicationStep, reproductionStep, verificationStep } from './proof-steps';
import { reducerFrom } from './reducer';
import type { RunStep } from './run-report-types';
import type { Snapshot } from './snapshot';

const SIGNAL_NAMES: Record<string, string> = {
  traces: 'Read traces',
  memory: 'Read memory',
  cpu: 'Read CPU',
  oom_events: 'Read crashes',
  deploy_history: 'Read deploy history',
  sandbox: 'Read sandbox result',
  flag_state: 'Read flag state',
  traffic_recipe: 'Captured traffic before the crash',
};

function signalName(kind: string, source: string): string {
  if (kind === 'logs') return source.startsWith('span metrics') ? 'Read failure rate' : 'Read logs';
  return SIGNAL_NAMES[kind] ?? 'Read a signal';
}

function withSteps(snapshot: Snapshot, did: RunStep[]): Snapshot {
  return { ...snapshot, runReport: { ...snapshot.runReport, did } };
}

function recordSignal(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { evidenceId, kind, source, summary, value } = payloadOf(event, 'evidence_recorded');
  const step = { text: signalName(kind, source), value: value ?? summary, evidenceId, questionId: null };
  return withSteps(snapshot, [...snapshot.runReport.did, step]);
}

function recordQuestion(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { questionId } = payloadOf(event, 'question_asked');
  const text = questionId === 'q-impact' ? 'Asked about customer impact' : 'Asked a question';
  const step = { text, value: WAITING_FOR_ANSWER, evidenceId: null, questionId };
  return withSteps(snapshot, [...snapshot.runReport.did, step]);
}

function recordAnswer(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  const { questionId, text } = payloadOf(event, 'context_supplied');
  const value = text.slice(0, 200);
  const did = snapshot.runReport.did;
  const asked = questionId !== null && did.some((step) => step.questionId === questionId);
  if (!asked) return withSteps(snapshot, [...did, { text: 'Operator added context', value, evidenceId: null, questionId }]);
  return withSteps(snapshot, did.map((step) => (step.questionId === questionId ? { ...step, value } : step)));
}

const WAITING_FOR_ANSWER = 'Waiting for an answer';
const NO_ANSWER = 'No answer';

function withStep(snapshot: Snapshot, found: RunStep | null): Snapshot {
  return found ? withSteps(snapshot, [...snapshot.runReport.did, found]) : snapshot;
}

function closeWaitingQuestions(snapshot: Snapshot): Snapshot {
  const did = snapshot.runReport.did.map((step) => (step.questionId !== null && step.value === WAITING_FOR_ANSWER ? { ...step, value: NO_ANSWER } : step));
  return withSteps(snapshot, did);
}

export const reduceRunSteps = reducerFrom({
  evidence_recorded: recordSignal,
  question_asked: recordQuestion,
  context_supplied: recordAnswer,
  experiment_reviewed: (snapshot, event) => withStep(snapshot, reproductionStep(snapshot, event)),
  verification_reviewed: (snapshot, event) => withStep(snapshot, verificationStep(snapshot, event)),
  publication_changed: (snapshot, event) => withStep(snapshot, publicationStep(event)),
  budget_exhausted: (snapshot) => withStep(closeWaitingQuestions(snapshot), { text: 'Time budget used up', value: 'Tools closed, test copy removed, no pull request opened', evidenceId: null, questionId: null }),
  investigation_stopped: closeWaitingQuestions,
  investigation_finished: closeWaitingQuestions,
});
