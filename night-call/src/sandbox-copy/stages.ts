import { join } from 'node:path';

import { createObserver } from './observation';
import { requestRecommendations } from './recommendations-request';
import { restartRecommendation } from './restart-recommendation';
import { activeRecipeReplay } from './round-workload';
import { writeJson } from './run-files';
import { currentSandbox, runRound, type RoundResult } from './sandbox';
import { setSandboxFlag } from './sandbox-flag';
import { sleep } from './time-budget';
import { workloadIsHealthy } from './workload-summary';

const requestCount = 400;
const pacingMs = 200;
const idleMs = 20_000;
const headroomShare = 0.8;

function requireStage(passed: boolean, message: string): void {
  if (!passed) throw new Error(message);
}

async function coldCheck(): Promise<void> {
  const { runFolder, endpoint } = currentSandbox();
  const observer = createObserver();
  const before = await observer.observe();
  const identity = { sessionId: 'cold-check', traceId: '0'.repeat(31) + '3' };
  const response = await requestRecommendations({ endpoint, identity });
  await sleep(idleMs);
  const afterIdle = await observer.observe();
  writeJson(join(runFolder, 'cold.json'), { response, before, afterIdle, idleSeconds: idleMs / 1000 });
}

export async function baselineStage(): Promise<RoundResult> {
  const plan = { name: 'baseline', flagVariant: 'off', restart: false, count: requestCount, pacingMs, stopOnFailure: false };
  const round = await runRound(plan);
  requireStage(workloadIsHealthy(round.summary, requestCount), 'healthy baseline failed');
  return round;
}

export async function reproduceStage(): Promise<RoundResult> {
  const { runFolder } = currentSandbox();
  setSandboxFlag({ runFolder, variant: 'on' });
  await restartRecommendation(runFolder);
  await coldCheck();
  const replay = activeRecipeReplay();
  const round = await runRound({ name: 'fault', restart: false, count: requestCount, pacingMs, stopOnFailure: true, replay });
  const reproduced = round.oomEvents.length > 0 && round.summary.errors > 0;
  requireStage(reproduced, 'fault did not establish both recommendation OOM and an HTTP failure');
  return round;
}

export async function mitigateStage(): Promise<RoundResult> {
  const plan = { name: 'mitigated', flagVariant: 'off', restart: true, count: requestCount, pacingMs, stopOnFailure: false };
  const round = await runRound(plan);
  const { peakMemoryBytes, limitBytes } = round.summary;
  requireStage(workloadIsHealthy(round.summary, requestCount), 'mitigation workload failed');
  const headroom = peakMemoryBytes !== null && limitBytes !== null && peakMemoryBytes < limitBytes * headroomShare;
  requireStage(headroom, 'mitigation did not establish memory headroom');
  return round;
}
