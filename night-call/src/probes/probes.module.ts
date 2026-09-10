import { Module } from '@nestjs/common';

import { ProbesService } from './probes.service';

@Module({
  providers: [ProbesService],
  exports: [ProbesService],
})
export class ProbesModule {}
