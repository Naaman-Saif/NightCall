import { Module } from '@nestjs/common';

import { ManualStartService } from '../incidents/manual-start.service';
import { ManualStartController } from './manual-start.controller';
import { OperatorController } from './operator.controller';
import { OperatorGuard } from './operator.guard';

@Module({ controllers: [OperatorController, ManualStartController], providers: [OperatorGuard, ManualStartService] })
export class OperatorApiModule {}
