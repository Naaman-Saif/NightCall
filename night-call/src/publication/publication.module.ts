import { Module } from '@nestjs/common';

import { OperatorGuard } from '../operator-api/operator.guard';
import { PublicationRetryController } from './publication-retry.controller';
import { PublicationWatcher } from './publication.watcher';

@Module({
  controllers: [PublicationRetryController],
  providers: [OperatorGuard, PublicationWatcher],
})
export class PublicationModule {}
