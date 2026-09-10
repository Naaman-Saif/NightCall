import { Injectable, Logger } from '@nestjs/common';

import { productionTarget } from '../config/targets';
import { flagChangesBetween, readFlagStates, type FlagChange } from '../evidence/config-diff';
import { readLastGreen, type GreenSnapshot } from '../evidence/last-green';
import type { Incident } from '../incidents/incident';
import { fileIssue } from '../report/github';
import { PipelineDeps } from './pipeline.deps';
import { writeRunRecord } from './run-record';
import type { EvidenceBundle } from './evidence-bundle';

@Injectable()
export class PipelineService {
  private readonly log = new Logger(PipelineService.name);

  constructor(private readonly deps: PipelineDeps) {}

  async run(incident: Incident): Promise<void> {
    const lastGreen = readLastGreen();
    if (!lastGreen) {
      this.log.warn(`no green snapshot yet, skipping ${incident.key}`);
      return;
    }
    const bundle = await this.investigate(incident, lastGreen);
    const issue = await this.deps.reporter.write(bundle);
    const filed = await fileIssue(issue.title, issue.body);
    writeRunRecord(bundle, filed.url);
    this.log.log(`filed ${filed.url} for ${incident.key}`);
  }

  private async investigate(incident: Incident, lastGreen: GreenSnapshot): Promise<EvidenceBundle> {
    const diff = this.diffSince(lastGreen);
    const production = await this.deps.probes.signature(productionTarget());
    const hypothesis = await this.deps.triage.run(incident, diff);
    const candidates = await this.deps.remediator.run(hypothesis, diff);
    const { reproduction, trials } = await this.deps.sandbox.run({ diff, production, candidates, knownGood: lastGreen.flags });
    return { incident, diff, hypothesis, reproduction, trials };
  }

  private diffSince(lastGreen: GreenSnapshot): FlagChange[] {
    const current = readFlagStates(productionTarget().flagdConfigPath);
    return flagChangesBetween(lastGreen.flags, current);
  }
}
