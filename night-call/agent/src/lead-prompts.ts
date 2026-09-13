import type { Brief } from './evidence-ledger.js';
import type { Answer } from './incident-api.js';
import type { UrgencyDecision } from './urgency.js';

export type IncidentFacts = { service: string; alertName: string };

export type DraftRequest = { answer: Answer | null; decision: UrgencyDecision; lastBrief: Brief | null; evidenceIds: string[] };

export const LEAD_SYSTEM_PROMPT = [
  'You investigate a live production incident in an online shop and write the incident report for NightCall.',
  'Readers return real production evidence, each reading with an evidenceId. Base every statement on readings you made and cite evidence ids exactly as returned.',
  'Never say anything is proven or confirmed; say what the evidence suggests.',
  'Quote numbers only as the readings state them. If the failure rate reads 0% or could not be measured, never say requests are failing.',
  'Write short, plain sentences for a developer on call who was just woken up.',
  'Write as the report itself: never mention agents, roles, models, tools or yourself.',
].join(' ');

export function firstBriefTask(facts: IncidentFacts, alreadyRead: string): string {
  return [
    `The alarm "${facts.alertName}" fired for the ${facts.service} service.`,
    `Already recorded, cite these ids: ${alreadyRead}`,
    `Before writing anything, call read_memory for ${facts.service} and read_deploy_history.`,
    'Then call update_brief once: a two sentence summary, known facts each citing evidence ids, what is still unknown, and the next step.',
    'Then call propose_hypothesis for one to three explanations, each citing supporting evidence ids and saying what a sandbox test would show.',
    'Finish with one short sentence.',
  ].join('\n');
}

export function keepReadingTask(facts: IncidentFacts): string {
  return [
    'The first brief is published and a question about customer impact is open.',
    `While waiting, read more evidence: logs and traces for ${facts.service} and frontend, and cpu for ${facts.service}.`,
    'Propose a hypothesis only if fewer than three exist and new evidence supports it. Do not update the brief.',
    'Finish with one short sentence.',
  ].join('\n');
}

export function classifyTask(answer: string): string {
  return [
    'The developer on call was asked whether the current failure rate is tolerable while a fix is tested, or whether the safest fix should be rushed.',
    `They answered: "${answer}"`,
    'Choose rush if they want the fix fast or the answer is unclear; choose tolerable if they can live with the failures for now. Give a one sentence reason.',
  ].join('\n');
}

export function draftBriefTask(request: DraftRequest): string {
  return [
    'Rewrite the incident brief so it reflects the answer about customer impact.',
    `Current brief: ${JSON.stringify(request.lastBrief)}`,
    `Answer: ${request.answer ? `"${request.answer.text}"` : 'no answer arrived in time'}. Decision: ${request.decision.urgency}, ${request.decision.reason}`,
    `Known facts may cite only these evidence ids: ${request.evidenceIds.join(', ')}.`,
    'Mention the answer in the summary. Return summary, knownFacts, unknowns, and nextDetail: one sentence on what the next step checks first.',
  ].join('\n');
}
