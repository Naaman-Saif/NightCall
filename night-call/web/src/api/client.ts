import type { IncidentEvent, IncidentListItem, Snapshot } from './contract';

export type ContextAnswer = { questionId: string | null; text: string; idempotencyKey: string };
export type SubmitAnswer = (answer: ContextAnswer) => Promise<void>;

export class RequestFailed extends Error {
  constructor(readonly status: number) {
    super(`Request failed with status ${status}`);
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new RequestFailed(response.status);
  return (await response.json()) as T;
}

function incidentPath(incidentId: string): string {
  return `/api/incidents/${encodeURIComponent(incidentId)}`;
}

export async function fetchIncidentList(): Promise<IncidentListItem[]> {
  return readJson(await fetch('/api/incidents'));
}

export async function fetchSnapshot(incidentId: string): Promise<Snapshot> {
  return readJson(await fetch(incidentPath(incidentId)));
}

export function eventStreamUrl(incidentId: string, afterSequence: number): string {
  return `${incidentPath(incidentId)}/events?after=${afterSequence}`;
}

export async function postContext(incidentId: string, answer: ContextAnswer): Promise<IncidentEvent> {
  const response = await fetch(`/op${incidentPath(incidentId)}/context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answer),
  });
  return readJson(response);
}
