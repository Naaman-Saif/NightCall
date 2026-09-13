import { recoverAndInterrupt } from '../investigation/boot-interruption';
import { readSnapshot } from '../investigation/incident-catalog';
import { incidentFolder } from '../investigation/incident-paths';
import { freshWriter, openIncident } from '../investigation/writer.fixture';
import { EventsBuffer } from './events-buffer';
import { keepSeries } from './keep-series';
import { productionEventsPath, readJsonLines, seriesPath } from './series-files';
import type { SeriesSample } from './series-sample';
import { seriesReply } from './series-reply';
import { ServiceTracks } from './service-tracks';

function sampleAt(service: string, minutesAgo: number): SeriesSample {
  const at = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  return { at, service, memoryBytes: 1000 - minutesAgo, limitBytes: service === 'night-call' ? null : 5000, cpuPercent: 3 };
}

function tracksWith(minutesAgo: number[]): ServiceTracks {
  const tracks = new ServiceTracks();
  for (const minutes of minutesAgo) tracks.trackOf('recommendation').samples.push(sampleAt('recommendation', minutes));
  for (const minutes of minutesAgo) tracks.trackOf('frontend').samples.push(sampleAt('frontend', minutes));
  return tracks;
}

describe('incident series', () => {
  it('freezes the window from before the alert for the service and its callers, then appends new samples once', async () => {
    const writer = freshWriter();
    const tracks = tracksWith([12, 8, 4]);
    const events = new EventsBuffer();
    const incidentId = await openIncident(writer);
    keepSeries({ stateDir: writer.stateDir, tracks, events });
    tracks.trackOf('recommendation').samples.push(sampleAt('recommendation', 0));
    events.add({ id: 'e1', at: new Date().toISOString(), service: 'recommendation', container: 'recommendation', action: 'oom', exitCode: null });
    keepSeries({ stateDir: writer.stateDir, tracks, events });
    keepSeries({ stateDir: writer.stateDir, tracks, events });
    const folder = incidentFolder(writer.stateDir, incidentId);
    const startedAt = String(readSnapshot(writer.stateDir, incidentId)?.incident.startedAt);
    const recommendation = readJsonLines<SeriesSample>(seriesPath(folder, 'recommendation'));
    expect(recommendation).toHaveLength(4);
    expect(recommendation.filter((sample) => sample.at < startedAt)).toHaveLength(3);
    expect(readJsonLines<SeriesSample>(seriesPath(folder, 'frontend'))).toHaveLength(3);
    expect(readJsonLines(productionEventsPath(folder))).toHaveLength(1);
  });

  it('stops appending once the incident is interrupted but keeps what it wrote', async () => {
    const writer = freshWriter();
    const tracks = tracksWith([6, 3]);
    const incidentId = await openIncident(writer);
    keepSeries({ stateDir: writer.stateDir, tracks, events: new EventsBuffer() });
    await recoverAndInterrupt(writer);
    tracks.trackOf('recommendation').samples.push(sampleAt('recommendation', 0));
    keepSeries({ stateDir: writer.stateDir, tracks, events: new EventsBuffer() });
    const samples = readJsonLines<SeriesSample>(seriesPath(incidentFolder(writer.stateDir, incidentId), 'recommendation'));
    expect(samples).toHaveLength(2);
  });

  it('measures the minutes back from the last sample and reports a missing limit as null', () => {
    const samples = [sampleAt('night-call', 40), sampleAt('night-call', 35), sampleAt('night-call', 32)];
    const reply = seriesReply({ service: 'night-call', samples, minutes: 5 });
    expect(reply.samples).toHaveLength(2);
    expect(reply.limitBytes).toBeNull();
    expect(Object.keys(reply.samples[0])).toEqual(['at', 'memoryBytes', 'cpuPercent']);
  });
});
