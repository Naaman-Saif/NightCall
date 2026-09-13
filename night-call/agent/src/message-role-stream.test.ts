import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Message, TextBlock } from '@strands-agents/sdk';
import { OpenAIModel } from '@strands-agents/sdk/models/openai';

import { fetchWithMessageRole } from './message-role-stream.js';

const toolCallFirst = [
  { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'call-1', type: 'function', function: { name: 'ping_box', arguments: '' } }] }, finish_reason: null }] },
  { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '{}' } }] }, finish_reason: null }] },
  { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
];

function eventStreamFetch(chunks: unknown[]): typeof fetch {
  const text = [...chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`), 'data: [DONE]\n\n'].join('');
  const pieces = [text.slice(0, 37), text.slice(37, 180), text.slice(180)];
  return async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({ start: (controller) => (pieces.forEach((piece) => controller.enqueue(encoder.encode(piece))), controller.close()) });
    return new Response(body, { headers: { 'content-type': 'text/event-stream', 'content-length': String(text.length) } });
  };
}

async function eventTypes(fetchToUse: typeof fetch): Promise<string[]> {
  const model = new OpenAIModel({ api: 'chat', modelId: 'zai-org/GLM-5.3', apiKey: 'test', clientConfig: { baseURL: 'http://stub.invalid/v1', maxRetries: 0, fetch: fetchToUse } });
  const types: string[] = [];
  for await (const event of model.streamAggregated([new Message({ role: 'user', content: [new TextBlock('Ping the box.')] })])) {
    const start = (event as { start?: { type?: string } }).start;
    types.push(start?.type ? `${event.type}:${start.type}` : event.type);
  }
  return types;
}

test('a stream with no role in any chunk, starting with a tool call, fails without the wrapper', async () => {
  await assert.rejects(eventTypes(eventStreamFetch(toolCallFirst)), /Stream ended without completing a message/);
});

test('the wrapper gives the first chunk the assistant role so the tool call comes through', async () => {
  const types = await eventTypes(fetchWithMessageRole(eventStreamFetch(toolCallFirst)));
  assert.equal(types[0], 'modelMessageStartEvent');
  assert.ok(types.includes('modelContentBlockStartEvent:toolUseStart'));
  assert.ok(types.includes('modelMessageStopEvent'));
});

const kimiAnswerWithoutFinish = [
  { choices: [{ index: 0, delta: { role: 'assistant', reasoning: ' The box' }, finish_reason: null }] },
  { choices: [{ index: 0, delta: { content: 'The box answered pong.' }, finish_reason: null }] },
  { choices: [], usage: { prompt_tokens: 273, completion_tokens: 44, total_tokens: 317 } },
];

const toolCallWithoutFinish = [
  { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'call-2', type: 'function', function: { name: 'ping_box', arguments: '{}' } }] }, finish_reason: null }] },
];

test('a stream that ends with no finish reason, as Kimi-K3 sends after a tool result, fails without the wrapper', async () => {
  await assert.rejects(eventTypes(eventStreamFetch(kimiAnswerWithoutFinish)), /Stream ended without completing a message/);
});

test('the wrapper closes a stream with no finish reason, as a stop or as a tool call', async () => {
  const answer = await eventTypes(fetchWithMessageRole(eventStreamFetch(kimiAnswerWithoutFinish)));
  assert.ok(answer.includes('modelContentBlockDeltaEvent'));
  assert.ok(answer.includes('modelMessageStopEvent'));
  const toolCall = await eventTypes(fetchWithMessageRole(eventStreamFetch(toolCallWithoutFinish)));
  assert.ok(toolCall.includes('modelContentBlockStartEvent:toolUseStart'));
  assert.ok(toolCall.includes('modelMessageStopEvent'));
});

test('a stream that already carries a role is left as it is', async () => {
  const withRole = [{ choices: [{ index: 0, delta: { role: 'assistant', content: 'Pong.' }, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }];
  const types = await eventTypes(fetchWithMessageRole(eventStreamFetch(withRole)));
  assert.deepEqual(types.filter((type) => type === 'modelMessageStartEvent'), ['modelMessageStartEvent']);
  assert.ok(types.includes('modelContentBlockDeltaEvent'));
});
