import {
  CreateAgentRuntimeCommand,
  GetAgentRuntimeCommand,
  ListAgentRuntimesCommand,
  ServiceQuotaExceededException,
  UpdateAgentRuntimeCommand,
} from '@aws-sdk/client-bedrock-agentcore-control';
import { setTimeout as sleep } from 'node:timers/promises';

import { agentCore, RUNTIME_NAME } from './aws.js';
import { runtimeShape } from './runtime-settings.js';

type RuntimeShape = ReturnType<typeof runtimeShape>;

async function existingRuntimeId(): Promise<string> {
  const { agentRuntimes } = await agentCore.send(new ListAgentRuntimesCommand({ maxResults: 100 }));
  const found = agentRuntimes?.find((runtime) => runtime.agentRuntimeName === RUNTIME_NAME);
  return found?.agentRuntimeId ?? '';
}

async function tryCreate(shape: RuntimeShape, attempt: number): Promise<string> {
  try {
    const created = await agentCore.send(new CreateAgentRuntimeCommand({ agentRuntimeName: RUNTIME_NAME, ...shape }));
    return created.agentRuntimeId ?? '';
  } catch (error) {
    if (error instanceof ServiceQuotaExceededException) throw error;
    console.log(`create attempt ${attempt} failed: ${String(error)}`);
    return '';
  }
}

async function createWithRetry(shape: RuntimeShape): Promise<string> {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const agentRuntimeId = await tryCreate(shape, attempt);
    if (agentRuntimeId !== '') return agentRuntimeId;
    await sleep(15_000);
  }
  throw new Error('could not create the agent runtime');
}

export async function waitUntilReady(agentRuntimeId: string) {
  for (let check = 1; check <= 120; check += 1) {
    const runtime = await agentCore.send(new GetAgentRuntimeCommand({ agentRuntimeId }));
    console.log(`runtime status: ${runtime.status}`);
    if (runtime.status === 'READY') return runtime;
    if (runtime.status?.endsWith('FAILED')) throw new Error(`runtime ${runtime.status}: ${runtime.failureReason}`);
    await sleep(10_000);
  }
  throw new Error('runtime did not become READY in 20 minutes');
}

export async function createOrUpdateRuntime(shape: RuntimeShape) {
  const found = await existingRuntimeId();
  if (found === '') return waitUntilReady(await createWithRetry(shape));
  await waitUntilReady(found);
  await agentCore.send(new UpdateAgentRuntimeCommand({ agentRuntimeId: found, ...shape }));
  return waitUntilReady(found);
}
