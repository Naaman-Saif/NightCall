import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { SettingsModule } from './config/settings.module';
import { IncidentsModule } from './incidents/incidents.module';
import { PipelineModule } from './pipeline/pipeline.module';

@Module({
  imports: [SettingsModule, ScheduleModule.forRoot(), IncidentsModule, PipelineModule],
})
export class AppModule {}
