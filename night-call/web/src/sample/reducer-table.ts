import type { EventType, IncidentEvent, Snapshot } from '../api/contract';

export type AreaReducer = (snapshot: Snapshot, event: IncidentEvent) => Snapshot;

export type HandlerTable = { [K in EventType]?: (snapshot: Snapshot, event: IncidentEvent<K>) => Snapshot };

export function reducerFrom(table: HandlerTable): AreaReducer {
  return (snapshot, event) => {
    const handle = table[event.type] as unknown as AreaReducer | undefined;
    return handle ? handle(snapshot, event) : snapshot;
  };
}
