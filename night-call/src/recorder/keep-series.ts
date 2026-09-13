import { allSnapshots } from '../investigation/incident-catalog';
import { incidentFolder } from '../investigation/incident-paths';
import type { Snapshot } from '../investigation/snapshot';
import type { EventsBuffer } from './events-buffer';
import { appendJsonLines, lastTimeIn, productionEventsPath, seriesPath } from './series-files';
import { seriesServicesFor } from './series-services';
import type { ServiceTracks } from './service-tracks';

export type SeriesSources = { stateDir: string; tracks: ServiceTracks; events: EventsBuffer };

type ServiceSeries = { folder: string; service: string };

function keepServiceSeries(sources: SeriesSources, target: ServiceSeries): void {
  const path = seriesPath(target.folder, target.service);
  const lastAt = lastTimeIn(path);
  const fresh = sources.tracks.windowOf(target.service).filter((sample) => lastAt === null || sample.at > lastAt);
  appendJsonLines(path, fresh);
}

function keepIncidentSeries(sources: SeriesSources, snapshot: Snapshot): void {
  const folder = incidentFolder(sources.stateDir, snapshot.incident.id);
  const services = seriesServicesFor(snapshot.incident.service);
  for (const service of services) keepServiceSeries(sources, { folder, service });
  const eventsPath = productionEventsPath(folder);
  const after = lastTimeIn(eventsPath) ?? '';
  appendJsonLines(eventsPath, sources.events.matching({ services, after }));
}

export function keepSeries(sources: SeriesSources): void {
  const active = allSnapshots(sources.stateDir).filter((snapshot) => snapshot.incident.lifecycle === 'active');
  for (const snapshot of active) keepIncidentSeries(sources, snapshot);
}
