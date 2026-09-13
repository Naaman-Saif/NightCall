import { Module } from '@nestjs/common';

import { ExperimentsModule } from '../experiments/experiments.module';
import { ManualStartService } from '../incidents/manual-start.service';
import { ManualStartController } from './manual-start.controller';
import { OperatorController } from './operator.controller';
import { OperatorGuard } from './operator.guard';

@Module({ imports: [ExperimentsModule], controllers: [OperatorController, ManualStartController], providers: [OperatorGuard, ManualStartService] })
export class OperatorApiModule {}
