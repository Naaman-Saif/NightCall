import { ConflictException, Controller, Inject, Param, Post, UseGuards } from '@nestjs/common';

import { EventWriter } from '../investigation/event-writer';
import { validIncidentId } from '../investigation/incident-paths';
import { requireSnapshot } from '../investigation/require-snapshot';
import { OperatorGuard } from '../operator-api/operator.guard';
import { githubJson } from '../production/github-client';
import { publishPullRequest } from './publish-pr';

@Controller('op/api/incidents/:id/publication')
@UseGuards(OperatorGuard)
export class PublicationRetryController {
  constructor(@Inject(EventWriter) private readonly writer: EventWriter) {}

  @Post('retry')
  async retry(@Param('id') id: string) {
    const incidentId = validIncidentId(id);
    const before = requireSnapshot(this.writer.stateDir, incidentId).publication;
    if (before.state !== 'failed') throw new ConflictException({ code: 'publication_not_retryable', state: before.state });
    const refusal = await publishPullRequest({ writer: this.writer, github: githubJson }, incidentId);
    return { refusal, publication: requireSnapshot(this.writer.stateDir, incidentId).publication };
  }
}
