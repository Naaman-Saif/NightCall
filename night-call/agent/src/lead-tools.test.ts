import assert from 'node:assert/strict';
import { test } from 'node:test';

import { newLedger } from './evidence-ledger.js';
import type { ToolContext } from './evidence-view.js';
import type { IncidentApi } from './incident-api.js';
import { readTools } from './read-tools.js';
import { budgetOf } from './tool-budget.js';
import { briefTool, hypothesisTool, statusTool } from './write-tools.js';

const unusedApi = {} as IncidentApi;

test('every lead tool builds with a JSON schema the model can read', () => {
  const context: ToolContext = { session: { api: unusedApi, ledger: newLedger() }, budget: budgetOf(12) };
  const tools = [...readTools(context), briefTool(context), hypothesisTool(context), statusTool(context)];
  assert.deepEqual(tools.map((tool) => tool.name), [
    'read_failure_rate', 'read_memory', 'read_cpu', 'read_crashes', 'read_logs', 'read_traces', 'read_deploy_history',
    'update_brief', 'propose_hypothesis', 'set_status',
  ]);
  const schemas = tools.map((tool) => JSON.stringify(tool.toolSpec.inputSchema));
  assert.ok(schemas.every((schema) => schema.includes('"type":"object"')));
  assert.match(schemas[1], /"recommendation"/);
});

test('reader queries mirror the server: trace ids are joined and empty ones left out', async () => {
  const queries: unknown[] = [];
  const api = { read: async (_reader: string, query: unknown) => (queries.push(query), { evidence: { evidenceId: 'ev-traces-1', kind: 'traces', summary: '', excerpt: '' }, data: {} }) };
  const context: ToolContext = { session: { api: api as unknown as IncidentApi, ledger: newLedger() }, budget: budgetOf(12) };
  const traces = readTools(context)[5] as unknown as { invoke(input: unknown): Promise<unknown> };
  const traceId = 'a'.repeat(32);
  await traces.invoke({ service: 'recommendation', minutes: 5, traceIds: [traceId, traceId] });
  await traces.invoke({ service: 'frontend', minutes: 5, traceIds: [] });
  assert.deepEqual(queries, [{ service: 'recommendation', minutes: 5, traceIds: `${traceId},${traceId}` }, { service: 'frontend', minutes: 5 }]);
});
