import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { createObserver, type Observation, type Observer } from './observation';
import { requestRecommendations } from './recommendations-request';
import { openJsonLines, writeJson, type JsonLinesWriter } from './run-files';
import { requireNoStopRequest } from './stop-request';
import { workloadShouldStop, type WorkloadSample } from './stop-rules';
import { cappedMs, sleep } from './time-budget';
import { summarizeWorkload, type WorkloadSummary } from './workload-summary';

export interface WorkloadPlan {
  name: string;
  count: number;
  pacingMs: number;
  stopOnFailure: boolean;
}

export interface WorkloadTarget {
  runFolder: string;
  endpoint: string;
}

interface WorkloadSession {
  plan: WorkloadPlan;
  endpoint: string;
  observer: Observer;
  before: Observation;
  writer: JsonLinesWriter;
}

async function takeSample(session: WorkloadSession, index: number): Promise<WorkloadSample> {
  cappedMs(1);
  requireNoStopRequest();
  const traceId = randomUUID().replace(/-/g, '');
  const started = Date.now();
  const identity = { sessionId: `${session.plan.name}-${index}`, traceId };
  const response = await requestRecommendations({ endpoint: session.endpoint, identity });
  const observation = await session.observer.observe();
  return { at: new Date().toISOString(), index: index + 1, traceId, response, observation, requestMs: Date.now() - started };
}

function reportProgress(session: WorkloadSession, sample: WorkloadSample): void {
  if (sample.index % 25 !== 1 && sample.response.status === 200) return;
  const { memoryBytes, cpuPercent, restarts } = sample.observation;
  const line = { stage: session.plan.name, request: sample.index, status: sample.response.status, memoryBytes, cpuPercent, restarts };
  console.log(JSON.stringify(line));
}

async function recordSamples(session: WorkloadSession): Promise<WorkloadSample[]> {
  const samples: WorkloadSample[] = [];
  for (let index = 0; index < session.plan.count; index += 1) {
    const sample = await takeSample(session, index);
    samples.push(sample);
    session.writer.write(sample);
    reportProgress(session, sample);
    if (workloadShouldStop({ sample, before: session.before }, session.plan.stopOnFailure)) break;
    await sleep(Math.max(0, session.plan.pacingMs - sample.requestMs));
  }
  return samples;
}

export async function runWorkload(plan: WorkloadPlan, target: WorkloadTarget): Promise<WorkloadSummary> {
  const observer = createObserver();
  const before = await observer.observe();
  const started = Date.now();
  const writer = openJsonLines(join(target.runFolder, `${plan.name}.jsonl`));
  const samples = await recordSamples({ plan, endpoint: target.endpoint, observer, before, writer }).finally(() => writer.close());
  const elapsedMs = Date.now() - started;
  const summary = summarizeWorkload({ samples, before, after: await observer.observe(), elapsedMs });
  writeJson(join(target.runFolder, `${plan.name}-summary.json`), summary);
  return summary;
}
