import { NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { openJsonLines, writeJson } from '../sandbox-copy/run-files';
import type { WorkloadSample } from '../sandbox-copy/stop-rules';
import type { CheckOutcome } from './evaluate-checks';
import type { TrafficSource } from './traffic-plan';

export type ExperimentEvidence = {
  experimentId: string;
  summary: string;
  recipeSource: TrafficSource;
  requestsSent: number;
  firstFailureAtRequest: number | null;
  oomEvents: { at: string }[];
  checks: CheckOutcome[];
  seriesRef: string | null;
  traceExcerpt: string | null;
};

export type SeriesWrite = { experimentId: string; samples: WorkloadSample[] };

const EXPERIMENT_ID = /^[A-Za-z0-9_-]{1,64}$/;

function evidencePath(folder: string, experimentId: string): string {
  if (!EXPERIMENT_ID.test(experimentId)) throw new NotFoundException({ code: 'experiment_not_found', experimentId });
  return join(folder, 'experiments', `${experimentId}.json`);
}

export function writeEvidence(folder: string, evidence: ExperimentEvidence): void {
  writeJson(evidencePath(folder, evidence.experimentId), evidence);
}

export function readEvidence(folder: string, experimentId: string): ExperimentEvidence {
  const path = evidencePath(folder, experimentId);
  if (!existsSync(path)) throw new NotFoundException({ code: 'evidence_not_ready', experimentId });
  return JSON.parse(readFileSync(path, 'utf8')) as ExperimentEvidence;
}

export function writeExperimentSeries(folder: string, write: SeriesWrite): string {
  const seriesRef = `series/experiment-${write.experimentId}.jsonl`;
  const lines = openJsonLines(join(folder, seriesRef));
  for (const { at, observation } of write.samples) {
    lines.write({ at, service: 'recommendation', memoryBytes: observation.memoryBytes, limitBytes: observation.limitBytes, cpuPercent: observation.cpuPercent });
  }
  lines.close();
  return seriesRef;
}
