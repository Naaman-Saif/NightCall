import { tool } from '@strands-agents/sdk';
import { z } from 'zod';

import { productionTarget, watchedServices } from '../config/targets';
import type { FlagChange } from '../evidence/config-diff';
import { recentLogs } from '../evidence/logs';
import { errorSpans } from '../evidence/traces';

const serviceInput = z.object({ service: z.string().describe(`one of: ${watchedServices.join(', ')}`) });

export const evidenceToolNames = ['recent_logs', 'error_spans', 'config_diff'];

function recentLogsTool() {
  return tool({
    name: 'recent_logs',
    description: 'Last 200 log lines from one production service container. Read only.',
    inputSchema: serviceInput,
    callback: async ({ service }) => (await recentLogs(productionTarget(), service)).join('\n'),
  });
}

function errorSpansTool() {
  return tool({
    name: 'error_spans',
    description: 'Error spans for one service from the last five minutes of traces. Read only.',
    inputSchema: serviceInput,
    callback: async ({ service }) => JSON.stringify(await errorSpans(productionTarget(), service)),
  });
}

function configDiffTool(diff: FlagChange[]) {
  return tool({
    name: 'config_diff',
    description: 'Feature flags that changed between the last healthy snapshot and now.',
    callback: () => JSON.stringify(diff),
  });
}

export function evidenceTools(diff: FlagChange[]) {
  return [recentLogsTool(), errorSpansTool(), configDiffTool(diff)];
}
