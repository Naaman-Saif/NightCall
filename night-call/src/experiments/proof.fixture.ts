import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { EventWriter } from '../investigation/event-writer';
import { appendAsService } from '../investigation/service-append';
import { openInvestigation, type AlertFacts } from '../investigation/open-investigation';
import { freshWriter, recommendationFacts } from '../investigation/writer.fixture';
import type { SandboxOwner } from './sandbox-owner';
import type { WorkerCommandBody } from './worker-messages';
import type { WorkerProcess } from './worker-process';

export const flagText = '{\n  "flags": {\n    "recommendationCacheFailure": {\n      "defaultVariant": "on",\n      "variants": { "off": false, "on": true }\n    }\n  }\n}\n';

const identity = { flagSha256: 'f', image: 'i', source: 's' };
const checks = [
  { name: 'fault.oom_kills', comparator: 'gte', value: 1, unit: 'count' },
  { name: 'fault.http_failures', comparator: 'gte', value: 1, unit: 'count' },
  { name: 'mitigated.http_failures', comparator: 'eq', value: 0, unit: 'count' },
  { name: 'mitigated.healthy_requests', comparator: 'gte', value: 200, unit: 'requests' },
];

function system(type: string, payload: Record<string, unknown>) {
  return { actor: 'system' as const, type: type as never, summary: type, refs: [], payload };
}

export async function incidentWithReproduction(accepted = true, facts: AlertFacts = recommendationFacts): Promise<{ writer: EventWriter; incidentId: string }> {
  const writer = freshWriter();
  const opened = await openInvestigation(writer, { facts, blockDuplicates: false });
  const incidentId = String(opened?.incidentId);
  const recipe = { flagVariant: 'on', restart: true, count: 400, pacingMs: 200, stopOnFailure: true, speed: 1 };
  const passed = [{ name: 'fault.oom_kills', passed: true, observed: 1 }, { name: 'fault.http_failures', passed: true, observed: 1 }];
  const drafts = [
    system('contract_recorded', { contractId: 'contract-1', checks }),
    system('experiment_started', { experimentId: 'exp-1', kind: 'reproduction', hypothesisId: 'h', contractId: 'contract-1', purpose: 'p', recipe, trafficSource: 'fixed_fallback' }),
    system('experiment_finished', { experimentId: 'exp-1', verdict: 'matches', checks: passed, seriesRef: null }),
  ];
  if (accepted) drafts.push(system('experiment_reviewed', { experimentId: 'exp-1', accepted: true, reasons: ['1 OOM kill'] }));
  for (const draft of drafts) await appendAsService(writer, { incidentId, draft });
  return { writer, incidentId };
}

function roundFile(folder: string, round: { name: string; failing: boolean }): { count: number; errors: number } {
  const fault = round.name.endsWith('-fault');
  const count = fault ? 2 : 200;
  const errors = fault || round.failing ? 1 : 0;
  const observation = { memoryBytes: 1000, limitBytes: 5000, cpuPercent: 5, restarts: 0, state: {}, image: 'i' };
  const lines = Array.from({ length: count }, (_, index) => {
    const status = index === count - 1 && errors > 0 ? 503 : 200;
    return JSON.stringify({ at: new Date(index * 1000).toISOString(), index: index + 1, traceId: 't', response: { status, products: 5 }, observation, requestMs: 1 });
  });
  writeFileSync(join(folder, `${round.name}.jsonl`), lines.join('\n'));
  return { count, errors };
}

export function fakeVerificationOwner(failingSuffix: string | null): SandboxOwner {
  const runFolder = mkdtempSync(join(tmpdir(), 'nc-verify-'));
  const answer = (body: WorkerCommandBody) => {
    if (body.command !== 'round') return identity;
    const failing = failingSuffix !== null && body.round.name.endsWith(failingSuffix);
    const { count, errors } = roundFile(runFolder, { name: body.round.name, failing });
    const summary = { count, errors, firstFailureRequest: errors ? count : null, peakMemoryBytes: 1000, limitBytes: 5000, restartsBefore: 0, restartsAfter: 0 };
    const oomEvents = body.round.name.endsWith('-fault') ? [{ at: '2026-09-14T00:01:00.000Z' }] : [];
    return { runFolder, name: body.round.name, summary, oomEvents, workload: {} };
  };
  const worker = { listen: () => undefined, request: (body: WorkerCommandBody) => Promise.resolve(answer(body)) } as unknown as WorkerProcess;
  const owner = { workerFor: async () => worker, freshStack: async () => runFolder, stopStack: async () => undefined, stackStartMinutes: () => 1, release: async () => undefined };
  return owner as unknown as SandboxOwner;
}
