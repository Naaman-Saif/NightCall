import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { incidentFolder } from '../investigation/incident-paths';
import { readSnapshot } from '../investigation/incident-catalog';
import { freshWriter, openIncident } from '../investigation/writer.fixture';
import type { EventWriter } from '../investigation/event-writer';
import { appendAsService } from '../investigation/service-append';
import { readEvidence } from './experiment-evidence';
import { reviewExperiment } from './experiment-review';
import { startExperiment } from './experiment-start';
import { JobRegistry } from './job-registry';
import type { SandboxOwner } from './sandbox-owner';
import type { WorkerCommandBody } from './worker-messages';
import type { WorkerProcess } from './worker-process';

const identity = { flagSha256: 'f', image: 'i', source: 's' };
const faultChecks = [
  { name: 'fault.oom_kills', comparator: 'gte', value: 1, unit: 'count' },
  { name: 'fault.http_failures', comparator: 'gte', value: 1, unit: 'count' },
];

function sample(index: number, status: number) {
  const observation = { memoryBytes: 1000 * index, limitBytes: 5000, cpuPercent: 10, restarts: 0, state: {}, image: 'i' };
  return { at: new Date(1_000 * index).toISOString(), index, traceId: 't', response: { status, products: 5 }, observation, requestMs: 5 };
}

function fakeOwner(options: { afterIdentity: typeof identity }): SandboxOwner {
  const runFolder = mkdtempSync(join(tmpdir(), 'nc-run-'));
  writeFileSync(join(runFolder, 'exp-1.jsonl'), [sample(1, 200), sample(2, 503)].map((line) => JSON.stringify(line)).join('\n'));
  const summary = { count: 2, errors: 1, firstFailureRequest: 2, peakMemoryBytes: 2000, limitBytes: 5000, restartsBefore: 0, restartsAfter: 1 };
  const identities = [identity, options.afterIdentity];
  const answer = (body: WorkerCommandBody) => {
    if (body.command === 'identity') return identities.shift();
    return { runFolder, name: 'exp-1', summary, oomEvents: [{ at: '2026-09-14T00:01:00.000Z' }], workload: {} };
  };
  const worker = { listen: () => undefined, request: (body: WorkerCommandBody) => Promise.resolve(answer(body)) } as unknown as WorkerProcess;
  const owner = { workerFor: async () => worker, warmUp: async () => runFolder, stackStartMinutes: () => 50 / 60, release: async () => undefined };
  return owner as unknown as SandboxOwner;
}

const body = { kind: 'reproduction', hypothesisId: 'h1', purpose: 'crash with the flag on', recipe: 'fixed_fallback', flagVariant: 'on', restart: true };

async function recordContract(writer: EventWriter, incidentId: string): Promise<void> {
  const draft = { actor: 'investigator' as const, type: 'contract_recorded' as const, summary: 'checks', refs: [], payload: { contractId: 'contract-1', checks: faultChecks } };
  await appendAsService(writer, { incidentId, draft });
}

async function finishedRun(afterIdentity = identity) {
  const writer = freshWriter();
  const incidentId = await openIncident(writer);
  const registry = new JobRegistry();
  const deps = { writer, registry, owner: fakeOwner({ afterIdentity }) };
  await expect(startExperiment(deps, { incidentId, body })).rejects.toEqual(new ConflictException({ code: 'contract_missing' }));
  await recordContract(writer, incidentId);
  await expect(recordContract(writer, incidentId)).rejects.toBeInstanceOf(ConflictException);
  const started = await startExperiment(deps, { incidentId, body });
  await registry.waitFor({ jobId: started.jobId, waitSeconds: 5, stop: new AbortController().signal });
  return { writer, incidentId, started, job: registry.find(started.jobId) };
}

describe('experiment flow', () => {
  it('runs a reproduction, records checks, evidence and series, and accepts only a passed review', async () => {
    const { writer, incidentId, started, job } = await finishedRun();
    expect(started).toMatchObject({ experimentId: 'exp-1', recipeSource: 'fixed_fallback', estimatedMinutes: 3, speed: 1 });
    expect(job).toMatchObject({ state: 'finished', result: { verdict: 'matches', failureReason: null } });
    const experiment = readSnapshot(writer.stateDir, incidentId)?.experiments[0];
    expect(experiment).toMatchObject({ trafficSource: 'fixed_fallback', verdict: 'matches', seriesRef: 'series/experiment-exp-1.jsonl' });
    const evidence = readEvidence(incidentFolder(writer.stateDir, incidentId), 'exp-1');
    expect(evidence).toMatchObject({ requestsSent: 2, firstFailureAtRequest: 2, oomEvents: [{ at: '2026-09-14T00:01:00.000Z' }] });
    const review = await reviewExperiment(writer, { incidentId, experimentId: 'exp-1', body: { accepted: true, reasons: ['1 OOM kill'] } });
    expect(review.eventId).toEqual(expect.any(String));
    expect(readSnapshot(writer.stateDir, incidentId)?.reproduction).toBe('confirmed');
  });

  it('fails the experiment and the incident when production identity changed, and refuses accepting it', async () => {
    const { writer, incidentId, job } = await finishedRun({ ...identity, image: 'changed' });
    expect(job).toMatchObject({ state: 'failed', result: { verdict: 'failed', failureReason: 'production identity changed during the experiment' } });
    const snapshot = readSnapshot(writer.stateDir, incidentId);
    expect(snapshot?.incident).toMatchObject({ lifecycle: 'finished', completionReason: 'infrastructure_failure' });
  });

  it('refuses accepting an experiment with a failed check', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    await recordContract(writer, incidentId);
    const system = (type: string, payload: Record<string, unknown>) => ({ actor: 'system' as const, type: type as never, summary: type, refs: [], payload });
    const recipe = { flagVariant: 'on', restart: true, count: 400, pacingMs: 200, stopOnFailure: true };
    await appendAsService(writer, { incidentId, draft: system('experiment_started', { experimentId: 'exp-1', kind: 'reproduction', hypothesisId: 'h', contractId: 'contract-1', purpose: 'p', recipe }) });
    await appendAsService(writer, { incidentId, draft: system('experiment_finished', { experimentId: 'exp-1', verdict: 'differs', checks: [{ name: 'fault.oom_kills', passed: false, observed: 0 }], seriesRef: null }) });
    const accept = reviewExperiment(writer, { incidentId, experimentId: 'exp-1', body: { accepted: true, reasons: ['looks fine'] } });
    await expect(accept).rejects.toEqual(new UnprocessableEntityException({ code: 'failed_check_accepted' }));
    await expect(reviewExperiment(writer, { incidentId, experimentId: 'exp-1', body: { accepted: false, reasons: ['no OOM kill'] } })).resolves.toBeDefined();
  });
});
