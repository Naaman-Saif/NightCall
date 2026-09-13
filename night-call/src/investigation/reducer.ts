import type { EventType, IncidentEvent } from './event-types';
import type { Snapshot } from './snapshot';

export type Reducer = (snapshot: Snapshot, event: IncidentEvent) => Snapshot;

export type ReducerTable = Partial<Record<EventType, Reducer>>;

export function reducerFrom(table: ReducerTable): Reducer {
  return (snapshot, event) => table[event.type]?.(snapshot, event) ?? snapshot;
}
