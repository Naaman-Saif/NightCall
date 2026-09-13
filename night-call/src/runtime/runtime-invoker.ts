import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from '@aws-sdk/client-bedrock-agentcore';
import { randomUUID } from 'node:crypto';

import { settings } from '../config/settings';

export type AgentRun = { incidentId: string; mode: 'hello' | 'long' | 'investigate' };
export type InvokeOutcome = { runtimeSessionId: string; statusCode: number; reply: string; elapsedMs: number };
type Reply = { statusCode: number; reply: string };

const client = new BedrockAgentCoreClient({ region: settings.bedrockRegion });

async function invokeRuntime(run: AgentRun, runtimeSessionId: string): Promise<Reply> {
  const payload = new TextEncoder().encode(JSON.stringify(run));
  const command = { agentRuntimeArn: settings.agentRuntimeArn, runtimeSessionId, payload, contentType: 'application/json' };
  const response = await client.send(new InvokeAgentRuntimeCommand(command));
  const reply = (await response.response?.transformToString()) ?? '';
  return { statusCode: response.statusCode ?? 0, reply };
}

async function invokeContainer(run: AgentRun, runtimeSessionId: string): Promise<Reply> {
  const headers = { 'content-type': 'application/json', 'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': runtimeSessionId };
  const address = `${settings.agentRuntimeArn}/invocations`;
  const response = await fetch(address, { method: 'POST', headers, body: JSON.stringify(run) });
  return { statusCode: response.status, reply: await response.text() };
}

export function targetsContainer(target: string): boolean {
  return target.startsWith('http://') || target.startsWith('https://');
}

export async function invokeAgents(run: AgentRun): Promise<InvokeOutcome> {
  const runtimeSessionId = randomUUID();
  const startedAt = Date.now();
  const send = targetsContainer(settings.agentRuntimeArn) ? invokeContainer : invokeRuntime;
  const outcome = await send(run, runtimeSessionId);
  return { runtimeSessionId, ...outcome, elapsedMs: Date.now() - startedAt };
}
