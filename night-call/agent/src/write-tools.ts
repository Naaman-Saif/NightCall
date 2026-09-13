import { tool } from '@strands-agents/sdk';
import { z } from 'zod';

import { type Brief, unknownEvidenceIds, type EvidenceLedger } from './evidence-ledger.js';
import { toolFailure, type LeadSession, type ToolContext } from './evidence-view.js';
import { plainText, wordingProblem } from './plain-words.js';
import { withBudget } from './tool-budget.js';

export const MAX_HYPOTHESES = 3;

const text = z.string().min(1).max(2000);
const ids = z.array(z.string().min(1).max(200)).max(50);
const briefShape = z.object({
  summary: text,
  knownFacts: z.array(z.object({ text, evidenceIds: ids.min(1) })).min(1).max(20),
  unknowns: z.array(text).max(20),
  nextStep: text,
});
const hypothesisShape = z.object({ claim: text, supportingEvidenceIds: ids.min(1), contradictingEvidenceIds: ids.default([]), predicted: text });
const statusShape = z.object({ status: z.enum(['working', 'waiting_for_evidence', 'waiting_for_context']), assignment: z.string().min(1).max(400) });

type Hypothesis = z.infer<typeof hypothesisShape>;

function idsProblem(ledger: EvidenceLedger, cited: string[]): string | null {
  const unknown = unknownEvidenceIds(ledger, cited);
  return unknown.length > 0 ? `unknown evidence ids ${unknown.join(', ')}; cite only evidenceId values returned by the readers` : null;
}

export function briefProblem(ledger: EvidenceLedger, brief: Brief): string | null {
  const texts = [brief.summary, brief.nextStep, ...brief.unknowns, ...brief.knownFacts.map((fact) => fact.text)];
  return idsProblem(ledger, brief.knownFacts.flatMap((fact) => fact.evidenceIds)) ?? wordingProblem(texts);
}

export function cleanBrief(brief: Brief): Brief {
  const knownFacts = brief.knownFacts.map((fact) => ({ text: plainText(fact.text), evidenceIds: fact.evidenceIds }));
  return { summary: plainText(brief.summary), knownFacts, unknowns: brief.unknowns.map(plainText), nextStep: plainText(brief.nextStep) };
}

export async function postBrief(session: LeadSession, brief: Brief): Promise<string> {
  const problem = briefProblem(session.ledger, brief);
  if (problem) return problem;
  const clean = cleanBrief(brief);
  await session.api.postEvent({ type: 'brief_updated', summary: clean.summary.slice(0, 2000), payload: clean });
  session.ledger.lastBrief = clean;
  return 'brief posted';
}

export async function postHypothesis(session: LeadSession, input: Hypothesis): Promise<string> {
  if (session.ledger.hypotheses.length >= MAX_HYPOTHESES) return 'three hypotheses are already proposed; propose no more';
  const problem = idsProblem(session.ledger, [...input.supportingEvidenceIds, ...input.contradictingEvidenceIds]);
  const wording = problem ?? wordingProblem([input.claim, input.predicted]);
  if (wording) return wording;
  const hypothesisId = `h-${session.ledger.hypotheses.length + 1}`;
  session.ledger.hypotheses.push(hypothesisId);
  const payload = { hypothesisId, ...input, claim: plainText(input.claim), predicted: plainText(input.predicted) };
  await session.api.postEvent({ type: 'hypothesis_proposed', summary: payload.claim, refs: [hypothesisId], payload });
  return `hypothesis ${hypothesisId} posted`;
}

async function postStatus(session: LeadSession, input: z.infer<typeof statusShape>): Promise<string> {
  const problem = wordingProblem([input.assignment]);
  if (problem) return problem;
  const payload = { role: 'lead', status: input.status, assignment: plainText(input.assignment) };
  await session.api.postEvent({ type: 'role_status_changed', summary: payload.assignment, payload });
  return 'status posted';
}

function guarded<Input>(context: ToolContext, write: (session: LeadSession, input: Input) => Promise<string>) {
  return withBudget(context.budget, (input: Input) => write(context.session, input).catch(toolFailure));
}

export function briefTool(context: ToolContext) {
  const description = 'Publishes the incident brief. Every known fact cites evidence ids returned by the readers.';
  return tool({ name: 'update_brief', description, inputSchema: briefShape, callback: guarded(context, postBrief) });
}

export function hypothesisTool(context: ToolContext) {
  const description = 'Publishes one explanation backed by evidence ids, with what a sandbox test would show. At most three in total.';
  return tool({ name: 'propose_hypothesis', description, inputSchema: hypothesisShape, callback: guarded(context, postHypothesis) });
}

export function statusTool(context: ToolContext) {
  const description = 'Says in a few plain words what NightCall is doing right now.';
  return tool({ name: 'set_status', description, inputSchema: statusShape, callback: guarded(context, postStatus) });
}
