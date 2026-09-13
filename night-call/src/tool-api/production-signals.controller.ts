import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';

import { EventWriter } from '../investigation/event-writer';
import { readFailureRate } from '../production/read-failure-rate';
import { readProductionLogs } from '../production/read-logs';
import { readProductionTraces } from '../production/read-traces';
import { failureRateQueryShape, logsQueryShape, parseQuery, tracesQueryShape } from '../production/reader-query';
import { answerReaderCall } from '../production/record-reading';
import { RoleGuard, type ToolRequest } from './role.guard';

type ReaderRequest = ToolRequest & { query: unknown };

@Controller('tool/incidents/:id/prod')
@UseGuards(RoleGuard)
export class ProductionSignalsController {
  constructor(@Inject(EventWriter) private readonly writer: EventWriter) {}

  @Get('logs')
  logs(@Req() request: ReaderRequest) {
    const read = () => readProductionLogs(parseQuery(logsQueryShape, request.query));
    return answerReaderCall(this.writer, { incidentId: request.params.id, read });
  }

  @Get('traces')
  traces(@Req() request: ReaderRequest) {
    const read = () => readProductionTraces(parseQuery(tracesQueryShape, request.query));
    return answerReaderCall(this.writer, { incidentId: request.params.id, read });
  }

  @Get('failure-rate')
  failureRate(@Req() request: ReaderRequest) {
    const read = () => readFailureRate(parseQuery(failureRateQueryShape, request.query));
    return answerReaderCall(this.writer, { incidentId: request.params.id, read });
  }
}
