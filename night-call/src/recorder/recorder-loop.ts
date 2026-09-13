import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { watchProductionEvents } from './events-watcher';
import { connectProductionEvents } from './production-watch';
import { SeriesKeeper } from './series-keeper';

const TICK_MS = 10_000;
const EVENTS_RETRY_MS = 5_000;

@Injectable()
export class RecorderLoop implements OnModuleInit, OnModuleDestroy {
  private stops: (() => void)[] = [];

  constructor(@Inject(SeriesKeeper) private readonly keeper: SeriesKeeper) {}

  onModuleInit(): void {
    const { recorder, events } = this.keeper.watch;
    const tick = () => void recorder.tick().then((samples) => samples && this.keeper.keep());
    const timer = setInterval(tick, TICK_MS);
    const stopEvents = watchProductionEvents({ buffer: events, connect: connectProductionEvents, retryMs: EVENTS_RETRY_MS });
    this.stops = [() => clearInterval(timer), stopEvents];
    tick();
  }

  onModuleDestroy(): void {
    for (const stop of this.stops) stop();
  }
}
