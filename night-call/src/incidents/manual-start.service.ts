import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import { SandboxOwner } from '../experiments/sandbox-owner';
import { warmInBackground } from '../experiments/warm-in-background';
import { openInvestigation, type AlertFacts } from '../investigation/open-investigation';
import { captureRecipeInBackground } from '../production/recipe-in-background';
import { SeriesKeeper } from '../recorder/series-keeper';
import { investigateInBackground } from '../runtime/background-invoke';

export const STARTABLE_SERVICES = ['recommendation'] as const;

export const MANUAL_ALERT_NAME = 'Manually triggered';

export type ManualStart = { incidentId: string; label: string };

const manualStartShape = z.strictObject({ service: z.enum(STARTABLE_SERVICES) });

export function manualFacts(service: string): AlertFacts {
  const labels = { trigger: 'manual', service };
  const summary = `Investigation started by hand for ${service}`;
  return { alertName: MANUAL_ALERT_NAME, service, severity: 'manual', summary, labels, illustrative: false };
}

@Injectable()
export class ManualStartService {
  private readonly log = new Logger('ManualStart');

  constructor(
    @Inject(SeriesKeeper) private readonly keeper: SeriesKeeper,
    @Inject(SandboxOwner) private readonly owner: SandboxOwner,
  ) {}

  async start(body: unknown): Promise<ManualStart> {
    const parsed = manualStartShape.safeParse(body);
    if (!parsed.success) throw new BadRequestException(`service must be one of: ${STARTABLE_SERVICES.join(', ')}`);
    const facts = manualFacts(parsed.data.service);
    const writer = this.keeper.writer;
    const opened = await openInvestigation(writer, { facts, blockDuplicates: true });
    if (!opened) throw new ConflictException(`a real incident is already active for ${facts.service}`);
    this.log.log(`manual investigation ${opened.incidentId} opened for ${facts.service}`);
    this.keeper.keep();
    captureRecipeInBackground(this.log, { writer, incidentId: opened.incidentId, openedAtMs: Date.parse(String(opened.payload.startedAt)) });
    warmInBackground(this.log, { owner: this.owner, opened });
    investigateInBackground(this.log, { writer, incidentId: opened.incidentId, trigger: 'manual' });
    return { incidentId: opened.incidentId, label: String(opened.payload.label) };
  }
}
