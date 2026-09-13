import { admit } from './admission';
import type { EventDraft, IncidentEvent } from './event-types';
import type { EventWriter } from './event-writer';
import { parsePayload } from './payload-schemas';

export type ServiceAppend = { incidentId: string; draft: EventDraft };

export function appendAsService(writer: EventWriter, request: ServiceAppend): Promise<IncidentEvent> {
  const draft = { ...request.draft, payload: parsePayload(request.draft.type, request.draft.payload) };
  return writer.update(request.incidentId, (events) => admit(events, draft));
}
