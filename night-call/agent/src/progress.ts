import { postTool } from './tool-client.js';

export type ProgressEvent = {
  actor: string;
  type: string;
  summary: string;
  payload: Record<string, unknown>;
};

export function postEvent(incidentId: string, event: ProgressEvent): Promise<unknown> {
  const path = `/tool/incidents/${encodeURIComponent(incidentId)}/events`;
  return postTool(path, { ...event, refs: [] });
}

export function logProgress(details: Record<string, unknown>): void {
  console.log(JSON.stringify({ at: new Date().toISOString(), ...details }));
}
