import { setTimeout as sleep } from 'node:timers/promises';

import { logProgress, postEvent } from './progress.js';

const STEP_COUNT = 16;
const STEP_MS = 60_000;

export async function runLong(incidentId: string): Promise<void> {
  const startedAt = Date.now();
  for (let step = 1; step <= STEP_COUNT; step += 1) {
    await sleep(STEP_MS);
    logProgress({ incidentId, mode: 'long', step, of: STEP_COUNT });
  }
  const waitedMinutes = Math.round((Date.now() - startedAt) / STEP_MS);
  const summary = `Long run finished after ${waitedMinutes} minutes`;
  const event = { actor: 'lead', type: 'role_status_changed', summary, payload: { role: 'lead', status: 'ready', assignment: summary } };
  logProgress({ incidentId, posted: await postEvent(incidentId, event) });
}
