import { join } from 'node:path';

import { identitiesMatch, productionIdentity, type ProductionIdentity } from './production-identity';
import { writeJson } from './run-files';

export interface OneRoundResult {
  runId: string;
  kind: string;
  startedAt: string;
  finishedAt?: string;
  passed: boolean;
  stagesPassed: boolean;
  minutes: Record<string, number>;
  stages: Record<string, unknown>;
  productionPreserved?: boolean;
  errors: string[];
}

export interface TimedStage {
  result: OneRoundResult;
  name: string;
}

export function newResult(runId: string): OneRoundResult {
  const startedAt = new Date().toISOString();
  return { runId, kind: 'one round', startedAt, passed: false, stagesPassed: false, minutes: {}, stages: {}, errors: [] };
}

export async function timed<T>(stage: TimedStage, work: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    return await work();
  } finally {
    stage.result.minutes[stage.name] = Math.round((Date.now() - started) / 600) / 100;
  }
}

export async function checkProductionAfter(result: OneRoundResult, context: { runFolder: string; before: ProductionIdentity }): Promise<void> {
  const after = await productionIdentity();
  writeJson(join(context.runFolder, 'production-after.json'), after);
  result.productionPreserved = identitiesMatch(context.before, after);
}

export function writeResult(result: OneRoundResult, runFolder: string): void {
  result.finishedAt = new Date().toISOString();
  result.minutes.total = Math.round((Date.parse(result.finishedAt) - Date.parse(result.startedAt)) / 600) / 100;
  result.passed = result.stagesPassed && result.productionPreserved === true && result.errors.length === 0;
  writeJson(join(runFolder, 'result.json'), result);
}
