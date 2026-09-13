import type { Model } from '@strands-agents/sdk';

export type RoleSetting = { role: string; provider: string; modelId: string };

export function readRoleSetting(role: string): RoleSetting {
  const value = process.env[`NIGHT_CALL_${role}_MODEL`] ?? '';
  const separator = value.indexOf(':');
  return { role, provider: value.slice(0, separator), modelId: value.slice(separator + 1) };
}

async function buildFeatherlessModel(modelId: string): Promise<Model> {
  const { OpenAIModel } = await import('@strands-agents/sdk/models/openai');
  return new OpenAIModel({
    api: 'chat',
    modelId,
    apiKey: process.env.FEATHERLESS_API_KEY,
    clientConfig: { baseURL: process.env.FEATHERLESS_BASE_URL, maxRetries: 0 },
  });
}

async function buildBedrockModel(modelId: string): Promise<Model> {
  const { BedrockModel } = await import('@strands-agents/sdk/models/bedrock');
  return new BedrockModel({ modelId });
}

export async function buildModel(setting: RoleSetting): Promise<Model> {
  if (setting.provider === 'featherless') return buildFeatherlessModel(setting.modelId);
  if (setting.provider === 'bedrock') return buildBedrockModel(setting.modelId);
  throw new Error(`unknown provider "${setting.provider}" for ${setting.role}`);
}
