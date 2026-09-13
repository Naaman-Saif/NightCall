import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { recoverAndInterrupt } from './boot-interruption';
import { EventWriter } from './event-writer';

@Injectable()
export class BootInterruption implements OnModuleInit {
  private readonly log = new Logger('Investigation');

  constructor(@Inject(EventWriter) private readonly writer: EventWriter) {}

  async onModuleInit(): Promise<void> {
    const interrupted = await recoverAndInterrupt(this.writer);
    for (const event of interrupted) this.log.warn(`incident ${event.incidentId} marked interrupted`);
  }
}
