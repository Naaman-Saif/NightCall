import type { ProductionEvent } from '../recorder/series-sample';
import { marker, type Marker } from './marker';

function markerOf(event: ProductionEvent): Marker | null {
  const common = { at: event.at, ref: event.id };
  if (event.action === 'start') return marker({ ...common, kind: 'restart', label: `${event.service} started` });
  if (event.action === 'oom') return marker({ ...common, kind: 'crash', label: `${event.service} ran out of memory` });
  if (event.action !== 'die') return null;
  const exit = event.exitCode ? ` with code ${event.exitCode}` : '';
  return marker({ ...common, kind: 'crash', label: `${event.service} exited${exit}` });
}

export function productionMarkers(service: string, events: ProductionEvent[]): Marker[] {
  return events
    .filter((event) => event.service === service)
    .map(markerOf)
    .filter((found): found is Marker => found !== null);
}
