import { recordSample } from './record-sample';
import type { ProductionSource, SeriesSample } from './series-sample';
import { ServiceTracks } from './service-tracks';

function isRecorded(result: PromiseSettledResult<SeriesSample>): result is PromiseFulfilledResult<SeriesSample> {
  return result.status === 'fulfilled';
}

export class Recorder {
  readonly tracks = new ServiceTracks();
  private busy = false;

  constructor(private readonly source: ProductionSource) {}

  async tick(): Promise<SeriesSample[] | null> {
    if (this.busy) return null;
    this.busy = true;
    try {
      return await this.sampleAll();
    } finally {
      this.busy = false;
    }
  }

  private async sampleAll(): Promise<SeriesSample[]> {
    const containers = await this.source.containers();
    const targets = containers.map((container) => ({ container, track: this.tracks.trackOf(container.service) }));
    const results = await Promise.allSettled(targets.map((target) => recordSample(this.source, target)));
    return results.filter(isRecorded).map((result) => result.value);
  }
}
