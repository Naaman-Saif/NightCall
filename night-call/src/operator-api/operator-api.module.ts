import { Module } from '@nestjs/common';

import { OperatorController } from './operator.controller';
import { OperatorGuard } from './operator.guard';

@Module({ controllers: [OperatorController], providers: [OperatorGuard] })
export class OperatorApiModule {}
