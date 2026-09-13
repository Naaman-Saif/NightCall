import type { WorkloadSample } from './stop-rules';

export type ScheduledRequest = { offsetMs: number; productIds: string; currencyCode: string; sessionId: string };

export type Schedule = { requests: ScheduledRequest[]; maxConcurrency: number; speed: number };

export type ScheduleRunner = {
  send(request: ScheduledRequest, index: number): Promise<WorkloadSample>;
  shouldStop(sample: WorkloadSample): boolean;
  wait(ms: number): Promise<void>;
  now(): number;
};

type ScheduleRun = {
  schedule: Schedule;
  runner: ScheduleRunner;
  samples: WorkloadSample[];
  inFlight: Set<Promise<void>>;
  startedAt: number;
  launched: number;
  stopped: boolean;
  failure: unknown;
};

const WAIT_SLICE_MS = 1000;

async function waitUntilDue(run: ScheduleRun, request: ScheduledRequest): Promise<void> {
  const dueAt = run.startedAt + request.offsetMs / run.schedule.speed;
  for (let remaining = dueAt - run.runner.now(); remaining > 0 && !run.stopped; remaining = dueAt - run.runner.now()) {
    await run.runner.wait(Math.min(WAIT_SLICE_MS, remaining));
  }
  while (run.inFlight.size >= Math.max(1, run.schedule.maxConcurrency)) await Promise.race(run.inFlight);
}

function settle(run: ScheduleRun, sample: WorkloadSample): void {
  run.samples.push(sample);
  if (run.runner.shouldStop(sample)) run.stopped = true;
}

function remember(run: ScheduleRun, error: unknown): void {
  run.failure = run.failure ?? error;
  run.stopped = true;
}

function launch(run: ScheduleRun, request: ScheduledRequest): void {
  const index = run.launched;
  run.launched += 1;
  const flight: Promise<void> = run.runner
    .send(request, index)
    .then((sample) => settle(run, sample))
    .catch((error: unknown) => remember(run, error))
    .finally(() => run.inFlight.delete(flight));
  run.inFlight.add(flight);
}

export async function runSchedule(schedule: Schedule, runner: ScheduleRunner): Promise<WorkloadSample[]> {
  if (!(schedule.speed > 0)) throw new Error(`replay speed must be positive, got ${schedule.speed}`);
  const startedAt = runner.now();
  const run: ScheduleRun = { schedule, runner, samples: [], inFlight: new Set(), startedAt, launched: 0, stopped: false, failure: null };
  const ordered = [...schedule.requests].sort((first, second) => first.offsetMs - second.offsetMs);
  for (const request of ordered) {
    await waitUntilDue(run, request);
    if (run.stopped) break;
    launch(run, request);
  }
  await Promise.all(run.inFlight);
  if (run.failure === null) return run.samples;
  throw run.failure instanceof Error ? run.failure : new Error(String(run.failure));
}
