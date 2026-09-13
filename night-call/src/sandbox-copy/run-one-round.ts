import { join } from 'node:path';

import { stopSandbox } from './cleanup';
import { snapshotContainers } from './container-snapshot';
import { productionIdentity, sourceChecksum, type ProductionIdentity } from './production-identity';
import { checkProductionAfter, newResult, timed, writeResult, type OneRoundResult } from './round-result';
import { recipeReplayFromArgs, useRecipeReplay } from './round-workload';
import { writeJson } from './run-files';
import { currentSandbox, prepareSandbox, preparedRunFolder, sandboxIsStarted, startSandbox } from './sandbox';
import { requireProductionMemoryLimits } from './memory-limits';
import { collectEvidence } from './stage-evidence';
import { interruptRequested } from './stop-request';
import { baselineStage, mitigateStage, reproduceStage } from './stages';
import { installSignalHandlers } from './signals';
import { startBudget } from './time-budget';

async function runStages(result: OneRoundResult, before: ProductionIdentity): Promise<void> {
  const { runFolder } = await timed({ result, name: 'start' }, () => startSandbox(result.runId));
  writeJson(join(runFolder, 'production-before.json'), before);
  await requireProductionMemoryLimits(runFolder);
  await snapshotContainers(join(runFolder, 'initial-containers.json'));
  const source = await sourceChecksum('nc-sandbox-recommendation');
  if (source !== before.source) throw new Error(`sandbox source ${source} differs from production ${before.source}`);
  result.stages.baseline = await timed({ result, name: 'baseline' }, baselineStage);
  result.stages.fault = await timed({ result, name: 'fault' }, reproduceStage);
  result.stages.mitigated = await timed({ result, name: 'mitigated' }, mitigateStage);
  const since = currentSandbox().startedAt;
  await timed({ result, name: 'evidence' }, () => collectEvidence({ runFolder, name: 'evidence', since }));
  await snapshotContainers(join(runFolder, 'final-containers.json'));
  result.stagesPassed = true;
}

async function recordFailure(result: OneRoundResult, error: unknown): Promise<void> {
  result.errors.push(String(error));
  console.log(JSON.stringify({ failed: String(error) }));
  if (!sandboxIsStarted() || interruptRequested()) return;
  const { runFolder, startedAt } = currentSandbox();
  await collectEvidence({ runFolder, name: 'failure-evidence', since: startedAt }).catch((failure: unknown) => {
    result.errors.push(`failure evidence: ${String(failure)}`);
  });
}

async function finish(result: OneRoundResult, before: ProductionIdentity): Promise<void> {
  const runFolder = preparedRunFolder();
  if (!runFolder) return;
  await timed({ result, name: 'stop' }, stopSandbox).catch((error: unknown) => result.errors.push(String(error)));
  await checkProductionAfter(result, { runFolder, before }).catch((error: unknown) => result.errors.push(String(error)));
  writeResult(result, runFolder);
  console.log(JSON.stringify({ passed: result.passed, minutes: result.minutes, output: runFolder }));
}

async function main(runId: string): Promise<number> {
  startBudget();
  installSignalHandlers();
  useRecipeReplay(recipeReplayFromArgs(process.argv));
  if (process.argv.includes('--render-only')) return prepareSandbox(runId).then((folder) => console.log(folder)).then(() => 0);
  const before = await productionIdentity();
  const result = newResult(runId);
  await runStages(result, before).catch((error: unknown) => recordFailure(result, error));
  await finish(result, before);
  return result.passed ? 0 : 1;
}

main(process.argv[2] ?? '').then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(JSON.stringify({ failed: String(error) }));
    process.exit(1);
  },
);
