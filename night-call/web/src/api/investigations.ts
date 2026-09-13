import { fetchIncidentList, readJson } from './client';

export type StartResult =
  | { outcome: 'started'; incidentId: string }
  | { outcome: 'already_running'; incidentId: string | null };

const ALREADY_RUNNING_STATUS = 409;

export async function fetchServices(): Promise<string[]> {
  return readJson(await fetch('/op/api/services'));
}

export async function findRunningIncidentId(service: string): Promise<string | null> {
  const items = await fetchIncidentList().catch(() => []);
  const running = items.find((item) => item.service === service && item.lifecycle === 'active' && !item.illustrative);
  return running?.id ?? null;
}

export async function startInvestigation(service: string): Promise<StartResult> {
  const response = await fetch('/op/api/investigations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service }),
  });
  if (response.status === ALREADY_RUNNING_STATUS) {
    return { outcome: 'already_running', incidentId: await findRunningIncidentId(service) };
  }
  const { incidentId } = await readJson<{ incidentId: string }>(response);
  return { outcome: 'started', incidentId };
}
