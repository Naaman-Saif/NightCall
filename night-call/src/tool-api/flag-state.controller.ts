import { Controller, ForbiddenException, Get, Inject, Req, UseGuards } from '@nestjs/common';

import { settings } from '../config/settings';
import { EventWriter } from '../investigation/event-writer';
import { readFlagState } from '../production/read-flag-state';
import { answerReaderCall } from '../production/record-reading';
import { RoleGuard, type ToolRequest } from './role.guard';

const FLAG_STATE_ROLES = new Set(['lead', 'investigator']);

@Controller('tool/incidents/:id/prod')
@UseGuards(RoleGuard)
export class FlagStateController {
  constructor(@Inject(EventWriter) private readonly writer: EventWriter) {}

  @Get('flag-state')
  async flagState(@Req() request: ToolRequest) {
    if (!FLAG_STATE_ROLES.has(request.toolRole ?? '')) throw new ForbiddenException('only lead and investigator may read the flag state');
    const read = () => readFlagState({ flagFilePath: settings.flagdConfigPath, branch: settings.demoBranch });
    return answerReaderCall(this.writer, { incidentId: request.params.id, read });
  }
}
