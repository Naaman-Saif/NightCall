import { NotFoundException } from '@nestjs/common';

import { readSnapshot } from './incident-catalog';
import type { Snapshot } from './snapshot';

export function requireSnapshot(stateDir: string, incidentId: string): Snapshot {
  const snapshot = readSnapshot(stateDir, incidentId);
  if (snapshot) return snapshot;
  throw new NotFoundException('incident not found');
}
