import { Module } from '@nestjs/common';

import { RoleGuard } from './role.guard';
import { ToolController } from './tool.controller';

@Module({
  controllers: [ToolController],
  providers: [RoleGuard],
})
export class ToolApiModule {}
