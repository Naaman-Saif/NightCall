import { join } from 'node:path';

import { readJsonLines } from '../recorder/series-files';
import { containerAddress } from './container-address';
import { writeJson } from './run-files';
import type { WorkloadSample } from './stop-rules';
import { sleep } from './time-budget';

export type StageTraceRequest = { runFolder: string; stage: string };

export type StageTraceSummary = { requested: number; failedRequests: number; failedWithTrace: number; missing: string[] };

const SUCCESSFUL_TRACE_LIMIT = 20;
const TRACE_TIMEOUT_MS = 10_000;
const FLUSH_WAIT_MS = 3_000;
const RETRY_WAIT_MS = 5_000;

export function traceIdsToFetch(samples: WorkloadSample[]): { failed: string[]; successful: string[] } {
  const failed = samples.filter((sample) => sample.response.status !== 200).map((sample) => sample.traceId);
  const healthy = samples.filter((sample) => sample.response.status === 200);
  return { failed, successful: healthy.slice(0, SUCCESSFUL_TRACE_LIMIT).map((sample) => sample.traceId) };
}

async function fetchTrace(address: string, traceId: string): Promise<unknown> {
  try {
    const url = `http://${address}:16686/jaeger/ui/api/traces/${traceId}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(TRACE_TIMEOUT_MS) });
    if (!response.ok) return null;
    return ((await response.json()) as { data?: unknown[] | null }).data?.[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchMissing(address: string, request: { wanted: string[]; found: Map<string, unknown> }): Promise<void> {
  for (const traceId of request.wanted.filter((id) => !request.found.has(id))) {
    const trace = await fetchTrace(address, traceId);
    if (trace) request.found.set(traceId, trace);
  }
}

export async function collectStageTraces(request: StageTraceRequest): Promise<StageTraceSummary> {
  const samples = readJsonLines<WorkloadSample>(join(request.runFolder, `${request.stage}.jsonl`));
  const { failed, successful } = traceIdsToFetch(samples);
  const wanted = [...failed, ...successful];
  const address = await containerAddress('jaeger');
  const found = new Map<string, unknown>();
  await sleep(FLUSH_WAIT_MS);
  await fetchMissing(address, { wanted, found });
  if (found.size < wanted.length) await sleep(RETRY_WAIT_MS).then(() => fetchMissing(address, { wanted, found }));
  const missing = wanted.filter((id) => !found.has(id));
  const failedWithTrace = failed.filter((id) => found.has(id)).length;
  const summary = { requested: wanted.length, failedRequests: failed.length, failedWithTrace, missing };
  writeJson(join(request.runFolder, 'evidence', request.stage, 'traces.json'), { ...summary, traces: [...found.values()] });
  return summary;
}
