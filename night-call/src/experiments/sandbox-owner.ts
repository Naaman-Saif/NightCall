import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';

import { LiveStream } from '../investigation/live-stream';
import type { WarmStart } from './worker-messages';
import type { WorkerProcess } from './worker-process';

export const WORKER_FACTORY = 'WORKER_FACTORY';
export type WorkerFactory = () => WorkerProcess;

type Warm = { incidentId: string; worker: WorkerProcess; starting: Promise<string> | null; unsubscribe(): void };

const ENDING_EVENTS = new Set(['investigation_stopped', 'investigation_finished', 'budget_exhausted']);
const FIRST_MEASURED_START_MS = 50_000;

@Injectable()
export class SandboxOwner implements OnApplicationShutdown {
  private readonly log = new Logger('SandboxOwner');
  private warm: Warm | null = null;
  private sweptSinceBoot = false;
  private lastStartMs = FIRST_MEASURED_START_MS;

  constructor(
    @Inject(LiveStream) private readonly stream: LiveStream,
    @Inject(WORKER_FACTORY) private readonly spawnWorker: WorkerFactory,
  ) {}

  stackStartMinutes(incidentId: string): number {
    const warming = this.warm?.incidentId === incidentId && this.warm.starting !== null;
    return warming ? 0 : this.lastStartMs / 60_000;
  }

  async workerFor(incidentId: string): Promise<WorkerProcess> {
    if (this.warm?.incidentId === incidentId) return this.warm.worker;
    await this.release();
    const worker = this.spawnWorker();
    const unsubscribe = this.stream.subscribe(incidentId, (event) => {
      if (ENDING_EVENTS.has(event.type)) void this.release(incidentId);
    });
    this.warm = { incidentId, worker, starting: null, unsubscribe };
    return worker;
  }

  warmUp(incidentId: string): Promise<string> {
    const warm = this.warm;
    if (warm?.incidentId !== incidentId) return Promise.reject(new Error(`no sandbox worker for ${incidentId}`));
    const startedAt = Date.now();
    const request = { command: 'start' as const, runId: `${incidentId}-${startedAt.toString(36)}`, sweepLeftovers: !this.sweptSinceBoot };
    this.sweptSinceBoot = true;
    warm.starting = warm.starting ?? warm.worker.request<WarmStart>(request).then((started) => {
      this.lastStartMs = Date.now() - startedAt;
      return started.runFolder;
    });
    return warm.starting;
  }

  async freshStack(incidentId: string): Promise<string> {
    const warm = this.warm;
    if (warm?.incidentId !== incidentId) throw new Error(`no sandbox worker for ${incidentId}`);
    if (warm.starting) {
      await warm.starting.catch(() => undefined);
      await warm.worker.request({ command: 'stop' });
      warm.starting = null;
    }
    return this.warmUp(incidentId);
  }

  async release(incidentId?: string): Promise<void> {
    const warm = this.warm;
    if (!warm || (incidentId && warm.incidentId !== incidentId)) return;
    this.warm = null;
    warm.unsubscribe();
    const code = await warm.worker.stop();
    this.log.log(`sandbox worker for ${warm.incidentId} stopped with code ${code}`);
  }

  onApplicationShutdown(): Promise<void> {
    return this.release();
  }
}
