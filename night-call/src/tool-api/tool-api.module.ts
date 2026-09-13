import { Module } from '@nestjs/common';

import { AgentCaseController } from './agent-case.controller';
import { FlagStateController } from './flag-state.controller';
import { ProductionSignalsController } from './production-signals.controller';
import { ProductionUsageController } from './production-usage.controller';
import { RoleGuard } from './role.guard';
import { ToolController } from './tool.controller';

@Module({
  controllers: [ToolController, ProductionSignalsController, ProductionUsageController, AgentCaseController, FlagStateController],
  providers: [RoleGuard],
})
export class ToolApiModule {}
