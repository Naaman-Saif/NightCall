import { Global, Module } from '@nestjs/common';

import { productionSource } from './production-source';
import { ProductionWatch } from './production-watch';
import { RecorderLoop } from './recorder-loop';
import { SeriesKeeper } from './series-keeper';

@Global()
@Module({
  providers: [
    { provide: ProductionWatch, useFactory: () => new ProductionWatch(productionSource) },
    SeriesKeeper,
    RecorderLoop,
  ],
  exports: [ProductionWatch, SeriesKeeper],
})
export class RecorderModule {}
