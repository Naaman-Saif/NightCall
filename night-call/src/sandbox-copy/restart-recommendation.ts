import { sandboxContainerName } from './constants';
import { inspectContainer } from './docker-api';
import { sandboxCompose } from './sandbox-compose';
import { cappedMs, sleep } from './time-budget';

const healthyWaitMs = 60_000;

async function recommendationIsHealthy(): Promise<boolean> {
  const info = await inspectContainer(sandboxContainerName('recommendation'));
  return info.State.Health?.Status === 'healthy';
}

export async function restartRecommendation(runFolder: string): Promise<void> {
  await sandboxCompose({ runFolder, args: ['restart', 'recommendation'], timeoutMs: 60_000 });
  const deadline = Date.now() + cappedMs(healthyWaitMs);
  while (Date.now() < deadline) {
    if (await recommendationIsHealthy()) return;
    await sleep(1000);
  }
  throw new Error('recommendation did not become healthy after restart');
}
