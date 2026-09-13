import { docker } from '../config/docker';
import { settings } from '../config/settings';
import { EventsBuffer } from './events-buffer';
import { Recorder } from './recorder';
import type { ProductionSource } from './series-sample';

export class ProductionWatch {
  readonly events = new EventsBuffer();
  readonly recorder: Recorder;

  constructor(source: ProductionSource) {
    this.recorder = new Recorder(source);
  }
}

export function connectProductionEvents(sinceSeconds: number): Promise<NodeJS.ReadableStream> {
  const filters = {
    type: ['container'],
    event: ['oom', 'die', 'start'],
    label: [`com.docker.compose.project=${settings.productionProject}`],
  };
  return docker.getEvents({ since: sinceSeconds, filters } as Parameters<typeof docker.getEvents>[0]);
}
