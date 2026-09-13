import { toolClientFor } from './tool-client.js';

export type ProgressEvent = {
  type: string;
  summary: string;
  payload: Record<string, unknown>;
  refs?: string[];
};

export function postEvent(incidentId: string, event: ProgressEvent): Promise<unknown> {
  const path = `/tool/incidents/${encodeURIComponent(incidentId)}/events`;
  return toolClientFor('lead').post(path, { refs: [], ...event });
}

export function logProgress(details: Record<string, unknown>): void {
  console.log(JSON.stringify({ at: new Date().toISOString(), ...details }));
}
