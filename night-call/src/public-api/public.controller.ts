import { Controller, Get, Inject, Param, Req, Res } from '@nestjs/common';

import { EventWriter } from '../investigation/event-writer';
import { validIncidentId } from '../investigation/incident-paths';
import { LiveStream } from '../investigation/live-stream';
import { requireSnapshot } from '../investigation/require-snapshot';
import { streamEvents } from './event-stream';
import { incidentSummaries } from './incident-summaries';
import type { StreamRequest, StreamResponse } from './stream-connection';

@Controller('api/incidents')
export class PublicController {
  constructor(
    @Inject(EventWriter) private readonly writer: EventWriter,
    @Inject(LiveStream) private readonly stream: LiveStream,
  ) {}

  @Get()
  list() {
    return incidentSummaries(this.writer.stateDir);
  }

  @Get(':id')
  snapshot(@Param('id') id: string) {
    return requireSnapshot(this.writer.stateDir, validIncidentId(id));
  }

  @Get(':id/events')
  events(@Req() request: StreamRequest, @Res() response: StreamResponse): void {
    const incidentId = validIncidentId(request.params.id);
    requireSnapshot(this.writer.stateDir, incidentId);
    streamEvents({ request, response }, { stateDir: this.writer.stateDir, stream: this.stream, incidentId });
  }
}
