import { setTimeout as sleep } from 'node:timers/promises';

import { evidenceBrief, postAnswerBrief, type BriefParts } from './answer-brief.js';
import { waitForImpactAnswer } from './context-wait.js';
import { failureShareOf, hasFailureRate, noteReading } from './evidence-ledger.js';
import type { Answer, IncidentApi } from './incident-api.js';
import { logProgress } from './progress.js';
import { describeError } from './retry.js';
import { decideUrgency, failuresPer100, impactQuestionEvent, pathSentence, type Classification, type UrgencyDecision } from './urgency.js';

export type InvestigationParts = BriefParts & { waitForAnswer?: (api: IncidentApi) => Promise<Answer | null> };

const UNREADABLE_ANSWER: Classification = { urgency: 'rush', reason: 'The answer could not be read, so this is treated as urgent.' };
const STOP_GRACE_MS = 30_000;

function announce(parts: InvestigationParts, status: { status: string; assignment: string }): Promise<unknown> {
  const payload = { role: 'lead', ...status };
  return parts.api.postEvent({ type: 'role_status_changed', summary: status.assignment, payload });
}

async function askImpact(parts: InvestigationParts): Promise<number> {
  if (!hasFailureRate(parts.ledger)) {
    noteReading(parts.ledger, { reader: 'failure-rate', reply: await parts.api.read('failure-rate', { minutes: 10 }) });
  }
  const failures = failuresPer100(failureShareOf(parts.ledger));
  await parts.api.postEvent(impactQuestionEvent(failures));
  return failures;
}

function alreadyReadText(parts: InvestigationParts): string {
  const fact = parts.ledger.summaries.get('failure-rate');
  return fact ? `${fact.evidenceIds[0]}: ${fact.text}` : 'not available';
}

async function writeFirstBrief(parts: InvestigationParts, signal: AbortSignal): Promise<void> {
  try {
    await parts.lead.writeFirstBrief({ signal, alreadyRead: alreadyReadText(parts) });
  } catch (error) {
    logProgress({ firstBriefFailed: describeError(error) });
  }
  if (parts.ledger.lastBrief || signal.aborted) return;
  logProgress({ evidenceBriefPosted: true });
  await parts.api.postEvent(evidenceBrief(parts.ledger));
}

async function briefThenRead(parts: InvestigationParts, signal: AbortSignal): Promise<void> {
  await writeFirstBrief(parts, signal);
  if (!signal.aborted) await parts.lead.keepReading(signal);
}

async function readUntilAnswered(parts: InvestigationParts): Promise<Answer | null> {
  const reading = new AbortController();
  const work = briefThenRead(parts, reading.signal).catch((error) => logProgress({ readingStopped: describeError(error) }));
  try {
    return await (parts.waitForAnswer ?? waitForImpactAnswer)(parts.api);
  } finally {
    reading.abort();
    await Promise.race([work, sleep(STOP_GRACE_MS, undefined, { ref: false })]);
  }
}

function classifyOrRush(parts: InvestigationParts) {
  return (answer: string) => parts.lead.classify(answer).catch(() => UNREADABLE_ANSWER);
}

export async function investigate(parts: InvestigationParts): Promise<UrgencyDecision> {
  await announce(parts, { status: 'working', assignment: 'Reading the failure rate before asking about customer impact' });
  const failures = await askImpact(parts);
  await announce(parts, { status: 'waiting_for_context', assignment: `Asked whether about ${failures} in 100 failing requests is tolerable; writing the first brief meanwhile` });
  const answer = await readUntilAnswered(parts);
  const decision = await decideUrgency(answer, classifyOrRush(parts));
  await postAnswerBrief(parts, { answer, decision });
  await announce(parts, { status: 'finished', assignment: pathSentence(decision) });
  return decision;
}
