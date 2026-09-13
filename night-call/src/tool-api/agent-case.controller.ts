import { Controller, Get, Inject, Req, Res, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { agentCaseOf } from '../investigation/agent-case';
import { waitForAnswers } from '../investigation/context-answers';
import { EventWriter } from '../investigation/event-writer';
import { validIncidentId } from '../investigation/incident-paths';
import { LiveStream } from '../investigation/live-stream';
import { requireSnapshot } from '../investigation/require-snapshot';
import { parseQuery } from '../production/reader-query';
import { RoleGuard, type ToolRequest } from './role.guard';

type CaseRequest = ToolRequest & { query: unknown };
type ClosingResponse = { on(event: 'close', listener: () => void): unknown };

const contextQueryShape = z.strictObject({
  after: z.coerce.number().int().min(0).default(0),
  waitSeconds: z.coerce.number().int().min(0).max(60).default(0),
});

@Controller('tool/incidents/:id')
@UseGuards(RoleGuard)
export class AgentCaseController {
  constructor(
    @Inject(EventWriter) private readonly writer: EventWriter,
    @Inject(LiveStream) private readonly stream: LiveStream,
  ) {}

  @Get('case')
  caseOf(@Req() request: CaseRequest) {
    const snapshot = requireSnapshot(this.writer.stateDir, validIncidentId(request.params.id));
    return agentCaseOf(snapshot, Date.now());
  }

  @Get('context')
  async context(@Req() request: CaseRequest, @Res({ passthrough: true }) response: ClosingResponse) {
    const incidentId = validIncidentId(request.params.id);
    requireSnapshot(this.writer.stateDir, incidentId);
    const { after, waitSeconds } = parseQuery(contextQueryShape, request.query);
    const closed = new AbortController();
    response.on('close', () => closed.abort());
    const wait = { stateDir: this.writer.stateDir, stream: this.stream, incidentId, after, waitSeconds, stop: closed.signal };
    const answers = await waitForAnswers(wait);
    return { incidentId, after, answers, lastAnswerSequence: answers.at(-1)?.sequence ?? after };
  }
}
