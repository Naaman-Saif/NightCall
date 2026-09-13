import { Inject, Injectable, Logger } from '@nestjs/common';

import { EventWriter } from '../investigation/event-writer';
import { keepSeries } from './keep-series';
import { ProductionWatch } from './production-watch';

@Injectable()
export class SeriesKeeper {
  private readonly log = new Logger('Recorder');

  constructor(
    @Inject(EventWriter) readonly writer: EventWriter,
    @Inject(ProductionWatch) readonly watch: ProductionWatch,
  ) {}

  keep(): void {
    try {
      keepSeries({ stateDir: this.writer.stateDir, tracks: this.watch.recorder.tracks, events: this.watch.events });
    } catch (error) {
      this.log.error(`series write failed: ${String(error)}`);
    }
  }
}
