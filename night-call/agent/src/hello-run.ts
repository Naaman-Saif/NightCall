import { Agent, tool } from '@strands-agents/sdk';
import { z } from 'zod';

import { buildModel, readRoleSetting } from './model.js';
import { logProgress, postEvent } from './progress.js';
import { toolClientFor } from './tool-client.js';

const REPLY_LIMIT = 400;

const pingBox = tool({
  name: 'ping_box',
  description: 'Asks the Night Call box whether it is reachable. Returns the box reply.',
  inputSchema: z.object({}),
  callback: async () => JSON.stringify(await toolClientFor('lead').get('/tool/ping')),
});

async function askLead() {
  const setting = readRoleSetting('LEAD');
  const agent = new Agent({
    model: await buildModel(setting),
    tools: [pingBox],
    printer: false,
    systemPrompt: 'Always call ping_box before answering. Never guess its reply.',
  });
  const result = await agent.invoke('Ping the Night Call box and say in one sentence what it answered.');
  const pingCalls = result.metrics?.toolMetrics.ping_box?.callCount ?? 0;
  return { model: `${setting.provider}:${setting.modelId}`, reply: String(result).trim(), pingCalls };
}

export async function runHello(incidentId: string): Promise<void> {
  const answer = await askLead();
  logProgress({ incidentId, mode: 'hello', ...answer });
  const summary = `Hello run: ${answer.reply}`.slice(0, REPLY_LIMIT);
  const payload = { role: 'lead', status: 'working', assignment: summary };
  const event = { actor: 'lead', type: 'role_status_changed', summary, payload };
  logProgress({ incidentId, posted: await postEvent(incidentId, event) });
}
