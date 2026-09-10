import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { IncidentsService } from '../incidents/incidents.service';
import { PipelineService } from './pipeline.service';

@Injectable()
export class WorkerService {
  private readonly log = new Logger(WorkerService.name);
  private busy = false;

  constructor(
    private readonly incidents: IncidentsService,
    private readonly pipeline: PipelineService,
  ) {}

  @Interval(5000)
  async tick(): Promise<void> {
    if (this.busy) return;
    const incident = this.incidents.nextOpen();
    if (!incident) return;
    this.busy = true;
    this.incidents.setStatus(incident.id, 'running');
    try {
      await this.pipeline.run(incident);
    } catch (error) {
      this.log.error(`pipeline failed for ${incident.key}: ${String(error)}`);
    } finally {
      this.incidents.setStatus(incident.id, 'closed');
      this.busy = false;
    }
  }
}
