import type { Logger } from '@nestjs/common';

import type { IncidentEvent } from '../investigation/event-types';
import type { SandboxOwner } from './sandbox-owner';

export type WarmRequest = { owner: SandboxOwner; opened: IncidentEvent };

export function warmInBackground(log: Logger, request: WarmRequest): void {
  const { owner, opened } = request;
  if (opened.payload.illustrative === true) return;
  const incidentId = opened.incidentId;
  owner
    .workerFor(incidentId)
    .then(() => owner.warmUp(incidentId))
    .then((runFolder) => log.log(`sandbox warm for ${incidentId} in ${runFolder}`))
    .catch((error: unknown) => log.error(`sandbox warm-up failed for ${incidentId}: ${String(error)}`));
}
