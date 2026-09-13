import type { Logger } from '@nestjs/common';

import type { EventDraft, IncidentEvent } from '../investigation/event-types';
import type { EventWriter } from '../investigation/event-writer';
import { appendAsService } from '../investigation/service-append';
import { invokeAgents } from './runtime-invoker';

export type InvestigationRequest = { writer: EventWriter; incidentId: string; trigger: 'manual' | 'alert' };

function outcomeDraft(request: InvestigationRequest, failure: string | null): EventDraft {
  if (failure === null) {
    const summary = `Agents started investigating (${request.trigger})`;
    return { actor: 'system', type: 'investigation_started', summary, refs: [], payload: { trigger: request.trigger } };
  }
  const payload = { reason: failure.slice(0, 2000) };
  return { actor: 'system', type: 'investigation_invoke_failed', summary: 'Agents could not be started', refs: [], payload };
}

async function invocationFailure(incidentId: string): Promise<string | null> {
  try {
    const outcome = await invokeAgents({ incidentId, mode: 'investigate' });
    return outcome.statusCode >= 200 && outcome.statusCode < 300 ? null : `agents answered ${outcome.statusCode}`;
  } catch (error: unknown) {
    return String(error);
  }
}

export async function startInvestigation(request: InvestigationRequest): Promise<IncidentEvent> {
  const failure = await invocationFailure(request.incidentId);
  return appendAsService(request.writer, { incidentId: request.incidentId, draft: outcomeDraft(request, failure) });
}

export function investigateInBackground(log: Logger, request: InvestigationRequest): void {
  startInvestigation(request)
    .then((event) => log.log(`${event.type} for ${request.incidentId}`))
    .catch((error: unknown) => log.error(`investigation state not recorded for ${request.incidentId}: ${String(error)}`));
}
