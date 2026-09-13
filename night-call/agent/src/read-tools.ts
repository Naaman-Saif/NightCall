import { tool } from '@strands-agents/sdk';
import { z } from 'zod';

import { readAndNote, type ToolContext } from './evidence-view.js';
import type { ReaderName, ReaderQuery } from './incident-api.js';
import { PRODUCTION_SERVICES } from './production-services.js';
import { withBudget } from './tool-budget.js';

const minutes = z.number().int().min(1).max(30).default(10).describe('Minutes back from now to read, 1 to 30');
const service = z.enum(PRODUCTION_SERVICES).describe('Production service name, for example recommendation or frontend');
const serviceWindow = z.object({ service, minutes });
const traceId = z.string().regex(/^[0-9a-f]{32}$/);

type ReaderSpec<Shape extends z.ZodType> = {
  name: string;
  reader: ReaderName;
  description: string;
  inputSchema: Shape;
  query?: (input: z.infer<Shape>) => ReaderQuery;
};

function readerTool<Shape extends z.ZodType>(spec: ReaderSpec<Shape>, context: ToolContext) {
  const toQuery = spec.query ?? ((input: z.infer<Shape>) => input as ReaderQuery);
  const read = (input: z.infer<Shape>) => readAndNote(context.session, { reader: spec.reader, query: toQuery(input) });
  return tool({ name: spec.name, description: spec.description, inputSchema: spec.inputSchema, callback: withBudget(context.budget, read) });
}

function tracesQuery(input: { service: string; minutes: number; traceIds: string[] }): ReaderQuery {
  const { traceIds, ...window } = input;
  return traceIds.length > 0 ? { ...window, traceIds: traceIds.join(',') } : window;
}

function signalTools(context: ToolContext) {
  return [
    readerTool({ name: 'read_failure_rate', reader: 'failure-rate', description: 'Share of failing recommendation requests from span metrics, plus the canary.', inputSchema: z.object({ minutes }) }, context),
    readerTool({ name: 'read_memory', reader: 'memory', description: 'Memory samples and limit for one service.', inputSchema: serviceWindow }, context),
    readerTool({ name: 'read_cpu', reader: 'cpu', description: 'CPU samples for one service.', inputSchema: serviceWindow }, context),
    readerTool({ name: 'read_crashes', reader: 'oom-events', description: 'Out-of-memory kills, exits and restarts for one service.', inputSchema: serviceWindow }, context),
  ];
}

function historyTools(context: ToolContext) {
  const logsInput = z.object({ service, minutes, tail: z.number().int().min(1).max(200).default(100) });
  const tracesInput = z.object({ service, minutes, traceIds: z.array(traceId).max(20).default([]) });
  return [
    readerTool({ name: 'read_logs', reader: 'logs', description: 'Recent log lines for one service.', inputSchema: logsInput }, context),
    readerTool({ name: 'read_traces', reader: 'traces', description: 'Recent traces for one service, optionally by trace id.', inputSchema: tracesInput, query: tracesQuery }, context),
    readerTool({ name: 'read_deploy_history', reader: 'deploy-history', description: 'Recent commits to the feature flag file with commit time and patch.', inputSchema: z.object({}) }, context),
  ];
}

export function readTools(context: ToolContext) {
  return [...signalTools(context), ...historyTools(context)];
}
