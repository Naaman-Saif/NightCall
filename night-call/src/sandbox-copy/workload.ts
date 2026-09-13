import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { createObserver, type Observation, type Observer } from './observation';
import { requestRecommendations } from './recommendations-request';
import { openJsonLines, writeJson, type JsonLinesWriter } from './run-files';
import { runSchedule, type Schedule, type ScheduledRequest } from './scheduled-workload';
import { requireNotInterrupted } from './stop-request';
import { workloadShouldStop, type WorkloadSample } from './stop-rules';
import { cappedMs, sleep } from './time-budget';
import { summarizeWorkload, type WorkloadSummary } from './workload-summary';

export interface WorkloadPlan {
  name: string;
  count: number;
  pacingMs: number;
  stopOnFailure: boolean;
  schedule?: Schedule;
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

type SampleRequest = { index: number; request?: ScheduledRequest };

async function takeSample(session: WorkloadSession, { index, request }: SampleRequest): Promise<WorkloadSample> {
  cappedMs(1);
  requireNotInterrupted();
  const traceId = randomUUID().replace(/-/g, '');
  const started = Date.now();
  const identity = { sessionId: request?.sessionId ?? `${session.plan.name}-${index}`, traceId };
  const query = request ? { productIds: request.productIds, currencyCode: request.currencyCode } : undefined;
  const response = await requestRecommendations({ endpoint: session.endpoint, identity, query });
  const observation = await session.observer.observe();
  return { at: new Date().toISOString(), index: index + 1, traceId, response, observation, requestMs: Date.now() - started };
}

function recorded(session: WorkloadSession, sample: WorkloadSample): WorkloadSample {
  session.writer.write(sample);
  if (sample.index % 25 !== 1 && sample.response.status === 200) return sample;
  const { memoryBytes, cpuPercent, restarts } = sample.observation;
  const line = { stage: session.plan.name, request: sample.index, status: sample.response.status, memoryBytes, cpuPercent, restarts };
  console.log(JSON.stringify(line));
  return sample;
}

function shouldStop(session: WorkloadSession, sample: WorkloadSample): boolean {
  return workloadShouldStop({ sample, before: session.before }, session.plan.stopOnFailure);
}

async function pacedSamples(session: WorkloadSession): Promise<WorkloadSample[]> {
  const samples: WorkloadSample[] = [];
  for (let index = 0; index < session.plan.count; index += 1) {
    const sample = recorded(session, await takeSample(session, { index }));
    samples.push(sample);
    if (shouldStop(session, sample)) break;
    await sleep(Math.max(0, session.plan.pacingMs - sample.requestMs));
  }
  return samples;
}

function scheduledSamples(session: WorkloadSession, schedule: Schedule): Promise<WorkloadSample[]> {
  return runSchedule(schedule, {
    send: async (request, index) => recorded(session, await takeSample(session, { index, request })),
    shouldStop: (sample) => shouldStop(session, sample),
    wait: sleep,
    now: Date.now,
  });
}

export async function runWorkload(plan: WorkloadPlan, target: WorkloadTarget): Promise<WorkloadSummary> {
  const observer = createObserver();
  const before = await observer.observe();
  const started = Date.now();
  const writer = openJsonLines(join(target.runFolder, `${plan.name}.jsonl`));
  const session = { plan, endpoint: target.endpoint, observer, before, writer };
  const work = plan.schedule ? scheduledSamples(session, plan.schedule) : pacedSamples(session);
  const samples = await work.finally(() => writer.close());
  const elapsedMs = Date.now() - started;
  const summary = summarizeWorkload({ samples, before, after: await observer.observe(), elapsedMs });
  writeJson(join(target.runFolder, `${plan.name}-summary.json`), summary);
  return summary;
}
