import { Agent, type AgentResult, type ToolList } from '@strands-agents/sdk';
import { z } from 'zod';

import type { ToolContext, LeadSession } from './evidence-view.js';
import { classifyTask, draftBriefTask, firstBriefTask, keepReadingTask, LEAD_SYSTEM_PROMPT, type DraftRequest, type IncidentFacts } from './lead-prompts.js';
import { buildModel, readRoleSetting } from './model.js';
import { readTools } from './read-tools.js';
import { withRetries } from './retry.js';
import { budgetOf } from './tool-budget.js';
import type { Classification } from './urgency.js';
import { briefTool, hypothesisTool, statusTool } from './write-tools.js';

export const LEAD_TOOL_LIMIT = 12;
const FIRST_BRIEF_TIMEOUT_MS = 4 * 60_000;
const TURN_LIMIT = 30;

const classificationShape = z.object({ urgency: z.enum(['rush', 'tolerable']), reason: z.string().min(1).max(400) });
const draftShape = z.object({
  summary: z.string().min(1).max(2000),
  knownFacts: z.array(z.object({ text: z.string().min(1).max(2000), evidenceIds: z.array(z.string()).min(1).max(20) })).max(20),
  unknowns: z.array(z.string().min(1).max(2000)).max(20),
  nextDetail: z.string().min(1).max(600),
});

export type BriefDraft = z.infer<typeof draftShape>;

export type Lead = {
  writeFirstBrief(): Promise<void>;
  keepReading(signal: AbortSignal): Promise<void>;
  classify(answer: string): Promise<Classification>;
  draftBrief(request: DraftRequest): Promise<BriefDraft>;
};

type AgentPlan = { tools: (context: ToolContext) => ToolList; signal?: AbortSignal; schema?: z.ZodType };

function investigationTools(context: ToolContext) {
  return [...readTools(context), briefTool(context), hypothesisTool(context), statusTool(context)];
}

function readingTools(context: ToolContext) {
  return [...readTools(context), hypothesisTool(context)];
}

function agentRunner(session: LeadSession) {
  return (plan: AgentPlan, prompt: string): Promise<AgentResult> =>
    withRetries(async () => {
      const tools = plan.tools({ session, budget: budgetOf(LEAD_TOOL_LIMIT) });
      const model = await buildModel(readRoleSetting('LEAD'));
      const agent = new Agent({ model, tools, printer: false, systemPrompt: LEAD_SYSTEM_PROMPT, retryStrategy: null, structuredOutputSchema: plan.schema });
      return agent.invoke(prompt, { cancelSignal: plan.signal, limits: { turns: TURN_LIMIT } });
    }, { signal: plan.signal });
}

export function leadFor(session: LeadSession, facts: IncidentFacts): Lead {
  const run = agentRunner(session);
  const noTools = () => [];
  return {
    writeFirstBrief: async () => void (await run({ tools: investigationTools, signal: AbortSignal.timeout(FIRST_BRIEF_TIMEOUT_MS) }, firstBriefTask(facts))),
    keepReading: async (signal) => void (await run({ tools: readingTools, signal }, keepReadingTask(facts))),
    classify: async (answer) => classificationShape.parse((await run({ tools: noTools, schema: classificationShape }, classifyTask(answer))).structuredOutput),
    draftBrief: async (request) => draftShape.parse((await run({ tools: noTools, schema: draftShape }, draftBriefTask(request))).structuredOutput),
  };
}
