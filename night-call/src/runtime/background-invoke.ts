import type { Logger } from '@nestjs/common';

import { invokeAgents } from './runtime-invoker';

export function investigateInBackground(log: Logger, incidentId: string): void {
  invokeAgents({ incidentId, mode: 'investigate' })
    .then((outcome) => log.log(`agents invoked for ${incidentId}: ${outcome.statusCode}`))
    .catch((error: unknown) => log.error(`agent invoke failed for ${incidentId}: ${String(error)}`));
}
