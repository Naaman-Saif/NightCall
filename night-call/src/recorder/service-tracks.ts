import type { CpuReading } from '../sandbox-copy/cpu-percent';
import { RingWindow } from './ring-window';
import type { SeriesSample } from './series-sample';

export const SAMPLES_PER_SERVICE = 180;

export type ServiceTrack = { samples: RingWindow<SeriesSample>; previousCpu: CpuReading | null };

export class ServiceTracks {
  private readonly tracks = new Map<string, ServiceTrack>();

  trackOf(service: string): ServiceTrack {
    const existing = this.tracks.get(service);
    if (existing) return existing;
    const track = { samples: new RingWindow<SeriesSample>(SAMPLES_PER_SERVICE), previousCpu: null };
    this.tracks.set(service, track);
    return track;
  }

  windowOf(service: string): SeriesSample[] {
    return this.tracks.get(service)?.samples.all() ?? [];
  }
}
