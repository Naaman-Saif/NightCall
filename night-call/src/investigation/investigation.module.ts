import { Global, Module } from '@nestjs/common';

import { settings } from '../config/settings';
import { BootInterruption } from './boot-interruption.service';
import { EventWriter } from './event-writer';
import { LiveStream } from './live-stream';

function createWriter(stream: LiveStream): EventWriter {
  return new EventWriter(settings.stateDir, stream);
}

@Global()
@Module({
  providers: [LiveStream, { provide: EventWriter, useFactory: createWriter, inject: [LiveStream] }, BootInterruption],
  exports: [EventWriter, LiveStream],
})
export class InvestigationModule {}
