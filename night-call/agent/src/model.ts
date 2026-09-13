import type { Model } from '@strands-agents/sdk';

import { fetchWithMessageRole } from './message-role-stream.js';

export type RoleSetting = { role: string; provider: string; modelId: string; reasoning: string };

export const DEFAULT_REASONING = 'high';
export const FEATHERLESS_MAX_COMPLETION_TOKENS = 32_768;
const NO_REASONING = 'none';

export function reasoningFor(role: string, env: NodeJS.ProcessEnv = process.env): string {
  return env[`NIGHT_CALL_${role}_REASONING`]?.trim() || DEFAULT_REASONING;
}

export function parseRoleSetting(role: string, value: string): RoleSetting {
  const separator = value.indexOf(':');
  return { role, provider: value.slice(0, separator), modelId: value.slice(separator + 1), reasoning: DEFAULT_REASONING };
}

export function readRoleSetting(role: string, env: NodeJS.ProcessEnv = process.env): RoleSetting {
  return { ...parseRoleSetting(role, env[`NIGHT_CALL_${role}_MODEL`] ?? ''), reasoning: reasoningFor(role, env) };
}

export function featherlessParams(setting: RoleSetting): Record<string, unknown> {
  const reasoning = setting.reasoning === NO_REASONING ? {} : { reasoning_effort: setting.reasoning };
  return { parallel_tool_calls: false, max_tokens: FEATHERLESS_MAX_COMPLETION_TOKENS, ...reasoning };
}

async function buildFeatherlessModel(setting: RoleSetting): Promise<Model> {
  const { OpenAIModel } = await import('@strands-agents/sdk/models/openai');
  return new OpenAIModel({
    api: 'chat',
    modelId: setting.modelId,
    apiKey: process.env.FEATHERLESS_API_KEY,
    params: featherlessParams(setting),
    clientConfig: { baseURL: process.env.FEATHERLESS_BASE_URL, maxRetries: 0, fetch: fetchWithMessageRole() },
  });
}

async function buildBedrockModel(modelId: string): Promise<Model> {
  const { BedrockModel } = await import('@strands-agents/sdk/models/bedrock');
  return new BedrockModel({ modelId });
}

export async function buildModel(setting: RoleSetting): Promise<Model> {
  if (setting.provider === 'featherless') return buildFeatherlessModel(setting);
  if (setting.provider === 'bedrock') return buildBedrockModel(setting.modelId);
  throw new Error(`unknown provider "${setting.provider}" for ${setting.role}`);
}
