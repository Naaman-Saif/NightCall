import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { SettingsModule } from './config/settings.module';
import { IncidentsModule } from './incidents/incidents.module';
import { ToolApiModule } from './tool-api/tool-api.module';

@Module({
  imports: [SettingsModule, ScheduleModule.forRoot(), IncidentsModule, ToolApiModule],
})
export class AppModule {}
