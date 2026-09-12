import { containerAddress } from './container-address';
import { requestRecommendations, type RequestResult } from './recommendations-request';
import { sandboxCompose } from './sandbox-compose';
import { joinSandboxNetwork } from './sandbox-network';
import { cappedMs, sleep } from './time-budget';

const readinessWaitMs = 180_000;
const readinessIdentity = { sessionId: 'readiness', traceId: '0'.repeat(31) + '1' };

async function waitForFrontend(endpoint: string): Promise<void> {
  const deadline = Date.now() + cappedMs(readinessWaitMs);
  let result: RequestResult = { status: null };
  while (Date.now() < deadline) {
    result = await requestRecommendations({ endpoint, identity: readinessIdentity });
    if (result.status === 200) return;
    await sleep(2000);
  }
  throw new Error(`frontend recommendation API did not become ready: ${JSON.stringify(result)}`);
}

export async function bringStackUp(runFolder: string): Promise<string> {
  await sandboxCompose({ runFolder, args: ['up', '-d', '--no-build', '--pull', 'never'], timeoutMs: 300_000 });
  await joinSandboxNetwork();
  const endpoint = `http://${await containerAddress('frontend')}:8080`;
  await waitForFrontend(endpoint);
  return endpoint;
}
