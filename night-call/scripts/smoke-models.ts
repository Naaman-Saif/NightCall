import { Agent, AgentResult, tool } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk/models/bedrock';
import { z } from 'zod';

type RoleSetting = { role: string; provider: string; modelId: string };

const EXPECTED_NUMBER = 42;
const ROLE_NAMES = ['LEAD', 'INVESTIGATOR', 'VERIFIER'];

const answerShape = z.object({ number: z.number(), sentence: z.string() });

const readNumber = tool({
  name: 'read_number',
  description: 'Returns the secret number. It is the only way to learn it.',
  inputSchema: z.object({}),
  callback: () => EXPECTED_NUMBER,
});

function readRoleSetting(role: string): RoleSetting {
  const value = process.env[`NIGHT_CALL_${role}_MODEL`] ?? '';
  const separator = value.indexOf(':');
  return { role, provider: value.slice(0, separator), modelId: value.slice(separator + 1) };
}

async function buildFeatherlessModel(modelId: string) {
  const { OpenAIModel } = await import('@strands-agents/sdk/models/openai');
  return new OpenAIModel({
    api: 'chat',
    modelId,
    apiKey: process.env.FEATHERLESS_API_KEY,
    clientConfig: { baseURL: process.env.FEATHERLESS_BASE_URL },
  });
}

async function buildModel(setting: RoleSetting) {
  if (setting.provider === 'featherless') return buildFeatherlessModel(setting.modelId);
  if (setting.provider === 'bedrock') return new BedrockModel({ modelId: setting.modelId });
  throw new Error(`unknown provider "${setting.provider}" for ${setting.role}`);
}

async function askForNumber(setting: RoleSetting): Promise<AgentResult> {
  const agent = new Agent({
    model: await buildModel(setting),
    tools: [readNumber],
    systemPrompt: 'Always call read_number to learn the secret number. Never guess it.',
    structuredOutputSchema: answerShape,
  });
  return agent.invoke('What is the secret number? Give the number and one sentence.');
}

function describeOutcome(setting: RoleSetting, result: AgentResult) {
  const calls = result.metrics?.toolMetrics.read_number?.callCount ?? 0;
  const answer = answerShape.safeParse(result.structuredOutput);
  const numberMatches = answer.success && answer.data.number === EXPECTED_NUMBER;
  return {
    role: setting.role,
    model: `${setting.provider}:${setting.modelId}`,
    readNumberCalls: calls,
    answer: answer.success ? answer.data : null,
    passed: calls > 0 && numberMatches,
  };
}

async function checkRole(role: string) {
  const setting = readRoleSetting(role);
  try {
    return describeOutcome(setting, await askForNumber(setting));
  } catch (error) {
    return { role, model: `${setting.provider}:${setting.modelId}`, passed: false, error: String(error) };
  }
}

async function checkEveryRole() {
  process.env.AWS_REGION = process.env.NIGHT_CALL_BEDROCK_REGION ?? 'eu-central-1';
  const outcomes = [];
  for (const role of ROLE_NAMES) outcomes.push(await checkRole(role));
  console.log(JSON.stringify(outcomes, null, 2));
  process.exitCode = outcomes.every((outcome) => outcome.passed) ? 0 : 1;
}

checkEveryRole();
