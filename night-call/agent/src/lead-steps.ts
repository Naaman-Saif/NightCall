import { Agent, type AgentResult } from '@strands-agents/sdk';
import { z } from 'zod';

import { causeSettingForAttempt, promptForAttempt, settingForAttempt } from './attempt-plan.js';
import type { Cause } from './cause-rules.js';
import { causesTask, classifyTask, LEAD_SYSTEM_PROMPT, type IncidentFacts } from './lead-prompts.js';
import { buildModel, type RoleSetting } from './model.js';
import { logProgress } from './progress.js';
import { withRetries } from './retry.js';
import type { Classification } from './urgency.js';

const TURN_LIMIT = 6;

const classificationShape = z.object({ urgency: z.enum(['rush', 'tolerable']), reason: z.string().min(1).max(400) });
const evidenceIds = z.array(z.string().min(1).max(200)).max(10);
const contradictionShape = z.object({ evidenceId: z.string().min(1).max(200), contradicts: z.string().min(1).max(600) });
const causeShape = z.object({
  claim: z.string().min(1).max(600),
  supportingEvidenceIds: evidenceIds,
  contradicting: z.array(contradictionShape).max(10).default([]),
  confirmWith: z.string().min(1).max(600),
});
const causesShape = z.object({ causes: z.array(causeShape).max(3) });

export function causeFromModel(proposed: z.infer<typeof causeShape>): Cause {
  const { claim, supportingEvidenceIds, contradicting, confirmWith } = proposed;
  const contradicts = Object.fromEntries(contradicting.map((item) => [item.evidenceId, item.contradicts]));
  return { claim, supportingEvidenceIds, contradictingEvidenceIds: contradicting.map((item) => item.evidenceId), contradicts, confirmWith };
}

export type CauseRequest = { readings: string; signal: AbortSignal; onFallback: () => void };
export type ClassifyRequest = { answer: string; signal: AbortSignal; onFallback: () => void };

export type Lead = {
  proposeCauses(request: CauseRequest): Promise<Cause[]>;
  classify(request: ClassifyRequest): Promise<Classification>;
};

type AgentPlan = { schema: z.ZodType; signal: AbortSignal; onFallback: () => void; settingFor: (attempt: number) => RoleSetting };

function runAgent(plan: AgentPlan, prompt: string): Promise<AgentResult> {
  return withRetries(async (attempt) => {
    const setting = plan.settingFor(attempt);
    if (setting.role === 'LEAD_FALLBACK') {
      logProgress({ fallbackModelAttempt: attempt });
      plan.onFallback();
    }
    const agent = new Agent({ model: await buildModel(setting), tools: [], printer: false, systemPrompt: LEAD_SYSTEM_PROMPT, retryStrategy: null, structuredOutputSchema: plan.schema });
    const startedAt = Date.now();
    const result = await agent.invoke(promptForAttempt({ prompt, attempt }), { cancelSignal: plan.signal, limits: { turns: TURN_LIMIT } });
    logModelCall({ setting, attempt, seconds: (Date.now() - startedAt) / 1000, result });
    return result;
  }, { signal: plan.signal });
}

type ModelCall = { setting: RoleSetting; attempt: number; seconds: number; result: AgentResult };

function logModelCall(call: ModelCall): void {
  const usage = call.result.metrics?.accumulatedUsage;
  const model = `${call.setting.modelId} reasoning ${call.setting.reasoning}`;
  logProgress({ modelCall: model, attempt: call.attempt, seconds: Number(call.seconds.toFixed(1)), inputTokens: usage?.inputTokens, outputTokens: usage?.outputTokens });
}

export function leadFor(facts: IncidentFacts): Lead {
  return {
    proposeCauses: async (request) => {
      const plan = { schema: causesShape, signal: request.signal, onFallback: request.onFallback, settingFor: (attempt: number) => causeSettingForAttempt(attempt) };
      const result = await runAgent(plan, causesTask(facts, request.readings));
      return causesShape.parse(result.structuredOutput).causes.map(causeFromModel);
    },
    classify: async (request) => {
      const plan = { schema: classificationShape, signal: request.signal, onFallback: request.onFallback, settingFor: (attempt: number) => settingForAttempt(attempt) };
      const result = await runAgent(plan, classifyTask(request.answer));
      return classificationShape.parse(result.structuredOutput);
    },
  };
}
