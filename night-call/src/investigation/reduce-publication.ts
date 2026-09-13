import type { IncidentEvent } from './event-types';
import { payloadOf } from './payload-schemas';
import { plainPayload } from './plain-payload';
import { reducerFrom } from './reducer';
import type { Snapshot } from './snapshot';

function changePublication(snapshot: Snapshot, event: IncidentEvent): Snapshot {
  return { ...snapshot, publication: plainPayload(payloadOf(event, 'publication_changed')) };
}

export const reducePublication = reducerFrom({ publication_changed: changePublication });
