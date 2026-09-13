import { readLog } from '../investigation/event-lines';
import type { IncidentEvent } from '../investigation/event-types';
import { incidentFolder } from '../investigation/incident-paths';
import { requireSnapshot } from '../investigation/require-snapshot';
import type { Snapshot } from '../investigation/snapshot';
import { productionEventsPath, readJsonLines } from '../recorder/series-files';
import type { ProductionEvent } from '../recorder/series-sample';
import { eventMarkers } from './event-markers';
import type { Marker } from './marker';
import { productionMarkers } from './production-markers';

export type IncidentRecord = { snapshot: Snapshot; events: IncidentEvent[]; productionEvents: ProductionEvent[] };

export function markersFor(record: IncidentRecord): Marker[] {
  const fromProduction = productionMarkers(record.snapshot.incident.service, record.productionEvents);
  const all = [...eventMarkers(record), ...fromProduction];
  return all.sort((first, second) => Date.parse(first.at) - Date.parse(second.at));
}

export function readIncidentMarkers(stateDir: string, incidentId: string): Marker[] {
  const snapshot = requireSnapshot(stateDir, incidentId);
  const folder = incidentFolder(stateDir, incidentId);
  const productionEvents = readJsonLines<ProductionEvent>(productionEventsPath(folder));
  return markersFor({ snapshot, events: readLog(folder).events, productionEvents });
}
