import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';

import { EventWriter } from '../investigation/event-writer';
import { readOomEvents } from '../production/read-oom-events';
import { readUsage } from '../production/read-usage';
import { parseQuery, serviceQueryShape } from '../production/reader-query';
import { answerReaderCall } from '../production/record-reading';
import { ProductionWatch } from '../recorder/production-watch';
import { RoleGuard, type ToolRequest } from './role.guard';

type ReaderRequest = ToolRequest & { query: unknown };

@Controller('tool/incidents/:id/prod')
@UseGuards(RoleGuard)
export class ProductionUsageController {
  constructor(
    @Inject(EventWriter) private readonly writer: EventWriter,
    @Inject(ProductionWatch) private readonly watch: ProductionWatch,
  ) {}

  @Get('memory')
  memory(@Req() request: ReaderRequest) {
    const read = async () => readUsage(this.watch.recorder.tracks, { ...parseQuery(serviceQueryShape, request.query), measure: 'memory' });
    return answerReaderCall(this.writer, { incidentId: request.params.id, read });
  }

  @Get('cpu')
  cpu(@Req() request: ReaderRequest) {
    const read = async () => readUsage(this.watch.recorder.tracks, { ...parseQuery(serviceQueryShape, request.query), measure: 'cpu' });
    return answerReaderCall(this.writer, { incidentId: request.params.id, read });
  }

  @Get('oom-events')
  oomEvents(@Req() request: ReaderRequest) {
    const read = async () => readOomEvents(this.watch.events, parseQuery(serviceQueryShape, request.query));
    return answerReaderCall(this.writer, { incidentId: request.params.id, read });
  }
}
