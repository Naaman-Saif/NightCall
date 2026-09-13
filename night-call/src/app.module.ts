import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { SettingsModule } from './config/settings.module';
import { IncidentsModule } from './incidents/incidents.module';
import { InvestigationModule } from './investigation/investigation.module';
import { OperatorApiModule } from './operator-api/operator-api.module';
import { PublicApiModule } from './public-api/public-api.module';
import { ToolApiModule } from './tool-api/tool-api.module';

@Module({
  imports: [
    SettingsModule,
    ScheduleModule.forRoot(),
    InvestigationModule,
    IncidentsModule,
    ToolApiModule,
    PublicApiModule,
    OperatorApiModule,
  ],
})
export class AppModule {}
