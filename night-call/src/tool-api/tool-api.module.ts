import { Module } from '@nestjs/common';

import { settings } from '../config/settings';
import { BearerGuard } from './bearer.guard';
import { EventLog } from './event-log';
import { EVENT_LOG, ToolController } from './tool.controller';

@Module({
  controllers: [ToolController],
  providers: [BearerGuard, { provide: EVENT_LOG, useFactory: () => new EventLog(settings.stateDir) }],
})
export class ToolApiModule {}
