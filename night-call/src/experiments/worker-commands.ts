import { readFileSync } from 'node:fs';

import type { TrafficRecipe } from '../production/traffic-recipe-types';
import { stopSandbox } from '../sandbox-copy/cleanup';
import { sweepLateSandboxResources } from '../sandbox-copy/late-containers';
import { requireProductionMemoryLimits } from '../sandbox-copy/memory-limits';
import { productionIdentity, sourceChecksum } from '../sandbox-copy/production-identity';
import type { RecipeReplay } from '../sandbox-copy/round-workload';
import { currentSandbox, runRound, startSandbox } from '../sandbox-copy/sandbox';
import { leaveSandboxNetwork } from '../sandbox-copy/sandbox-network';
import { shapedRecipe } from './capped-recipe';
import type { RoundOutcome, RoundRequest, WarmStart, WorkerCommand } from './worker-messages';

async function sweepLeftovers(): Promise<void> {
  await leaveSandboxNetwork().catch(() => undefined);
  const swept = await sweepLateSandboxResources();
  console.error(JSON.stringify({ leftoversSwept: swept }));
}

async function startWarm(sweep: boolean, runId: string): Promise<WarmStart> {
  if (sweep) await sweepLeftovers();
  const session = await startSandbox(runId);
  await requireProductionMemoryLimits(session.runFolder);
  const production = await productionIdentity();
  const source = await sourceChecksum('nc-sandbox-recommendation');
  if (source !== production.source) throw new Error(`sandbox source ${source} differs from production ${production.source}`);
  return { runFolder: session.runFolder };
}

function replayOf(round: RoundRequest): RecipeReplay | null {
  if (!round.recipePath) return null;
  const recipe = JSON.parse(readFileSync(round.recipePath, 'utf8')) as TrafficRecipe;
  const capped = shapedRecipe(recipe, { speed: round.speed, capMs: round.replayCapMs, requestCount: round.requestCount });
  if (capped.requests.length === 0) throw new Error(`recipe ${round.recipePath} has no requests to replay`);
  return { recipe: capped, speed: round.speed, recipePath: round.recipePath };
}

function atOf(event: unknown): { at: string } {
  const seconds = (event as { time?: number }).time ?? 0;
  return { at: new Date(seconds * 1000).toISOString() };
}

async function playRound(round: RoundRequest): Promise<RoundOutcome> {
  const { name, flagVariant, restart, stopOnFailure, count, pacingMs } = round;
  const result = await runRound({ name, flagVariant, restart, stopOnFailure, count, pacingMs, replay: replayOf(round) });
  const { runFolder } = currentSandbox();
  return { runFolder, name, summary: result.summary, oomEvents: result.oomEvents.map(atOf), workload: result.workload };
}

export function runCommand(command: WorkerCommand): Promise<unknown> {
  if (command.command === 'identity') return productionIdentity();
  if (command.command === 'start') return startWarm(command.sweepLeftovers, command.runId);
  if (command.command === 'round') return playRound(command.round);
  return stopSandbox();
}
