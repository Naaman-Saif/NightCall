import { postAnswerBrief, type BriefParts } from './answer-brief.js';
import { waitForImpactAnswer } from './context-wait.js';
import { failureShareOf, hasFailureRate, noteReading } from './evidence-ledger.js';
import type { Answer, IncidentApi } from './incident-api.js';
import { logProgress } from './progress.js';
import { describeError } from './retry.js';
import { decideUrgency, failuresPer100, impactQuestionEvent, pathSentence, type Classification, type UrgencyDecision } from './urgency.js';

export type InvestigationParts = BriefParts & { waitForAnswer?: (api: IncidentApi) => Promise<Answer | null> };

const UNREADABLE_ANSWER: Classification = { urgency: 'rush', reason: 'The answer could not be read, so this is treated as urgent.' };

function announce(parts: InvestigationParts, status: { status: string; assignment: string }): Promise<unknown> {
  const payload = { role: 'lead', ...status };
  return parts.api.postEvent({ type: 'role_status_changed', summary: status.assignment, payload });
}

async function writeFirstBrief(parts: InvestigationParts): Promise<void> {
  try {
    await parts.lead.writeFirstBrief();
  } catch (error) {
    logProgress({ firstBriefFailed: describeError(error) });
  }
}

async function askImpact(parts: InvestigationParts): Promise<number> {
  if (!hasFailureRate(parts.ledger)) {
    noteReading(parts.ledger, { reader: 'failure-rate', reply: await parts.api.read('failure-rate', { minutes: 10 }) });
  }
  const failures = failuresPer100(failureShareOf(parts.ledger));
  await parts.api.postEvent(impactQuestionEvent(failures));
  return failures;
}

async function waitWhileReading(parts: InvestigationParts): Promise<Answer | null> {
  const reading = new AbortController();
  const readingDone = parts.lead.keepReading(reading.signal).catch((error) => logProgress({ keepReadingStopped: String(error).slice(0, 200) }));
  try {
    return await (parts.waitForAnswer ?? waitForImpactAnswer)(parts.api);
  } finally {
    reading.abort();
    await readingDone;
  }
}

function classifyOrRush(parts: InvestigationParts) {
  return (answer: string) => parts.lead.classify(answer).catch(() => UNREADABLE_ANSWER);
}

export async function investigate(parts: InvestigationParts): Promise<UrgencyDecision> {
  await announce(parts, { status: 'working', assignment: 'Reading production evidence and writing the first brief' });
  await writeFirstBrief(parts);
  const failures = await askImpact(parts);
  await announce(parts, { status: 'waiting_for_context', assignment: `Asked whether about ${failures} in 100 failing requests is tolerable; reading more evidence meanwhile` });
  const answer = await waitWhileReading(parts);
  const decision = await decideUrgency(answer, classifyOrRush(parts));
  await postAnswerBrief(parts, { answer, decision });
  await announce(parts, { status: 'finished', assignment: pathSentence(decision) });
  return decision;
}
