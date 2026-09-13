import { Agent, type AgentResult } from '@strands-agents/sdk';
import { z } from 'zod';

import { FALLBACK_ATTEMPT, promptForAttempt, settingForAttempt } from './attempt-plan.js';
import type { Cause } from './cause-rules.js';
import { causesTask, classifyTask, LEAD_SYSTEM_PROMPT, type IncidentFacts } from './lead-prompts.js';
import { buildModel, type RoleSetting } from './model.js';
import { logProgress } from './progress.js';
import { withRetries } from './retry.js';
import type { Classification } from './urgency.js';

const TURN_LIMIT = 6;

const classificationShape = z.object({ urgency: z.enum(['rush', 'tolerable']), reason: z.string().min(1).max(400) });
const evidenceIds = z.array(z.string().min(1).max(200)).max(10);
const causeShape = z.object({
  claim: z.string().min(1).max(600),
  supportingEvidenceIds: evidenceIds,
  contradictingEvidenceIds: evidenceIds.default([]),
  confirmWith: z.string().min(1).max(600),
});
const causesShape = z.object({ causes: z.array(causeShape).max(3) });

export type CauseRequest = { readings: string; signal: AbortSignal; onFallback: () => void };
export type ClassifyRequest = { answer: string; signal: AbortSignal; onFallback: () => void };

export type Lead = {
  proposeCauses(request: CauseRequest): Promise<Cause[]>;
  classify(request: ClassifyRequest): Promise<Classification>;
};

type AgentPlan = { schema: z.ZodType; signal: AbortSignal; onFallback: () => void };

function runAgent(plan: AgentPlan, prompt: string): Promise<AgentResult> {
  return withRetries(async (attempt) => {
    if (attempt === FALLBACK_ATTEMPT) {
      logProgress({ fallbackModelAttempt: attempt });
      plan.onFallback();
    }
    const setting = settingForAttempt(attempt);
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
      const result = await runAgent({ schema: causesShape, signal: request.signal, onFallback: request.onFallback }, causesTask(facts, request.readings));
      return causesShape.parse(result.structuredOutput).causes;
    },
    classify: async (request) => {
      const result = await runAgent({ schema: classificationShape, signal: request.signal, onFallback: request.onFallback }, classifyTask(request.answer));
      return classificationShape.parse(result.structuredOutput);
    },
  };
}
