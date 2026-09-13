import { useEffect, useState } from 'react';
import { fetchServices, startInvestigation } from '../api/investigations';

export type StartState =
  | { status: 'ready' }
  | { status: 'starting' }
  | { status: 'failed' }
  | { status: 'already_running'; incidentId: string | null };

export function operatorIncidentPath(incidentId: string): string {
  return `/op/incidents/${encodeURIComponent(incidentId)}`;
}

export function useServices() {
  const [services, setServices] = useState<string[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    fetchServices().then(setServices, () => setLoadFailed(true));
  }, []);
  return { services, loadFailed };
}

export function useStartInvestigation() {
  const [state, setState] = useState<StartState>({ status: 'ready' });
  const start = async (service: string) => {
    setState({ status: 'starting' });
    const result = await startInvestigation(service).catch(() => null);
    if (!result) return setState({ status: 'failed' });
    if (result.outcome === 'already_running') return setState({ status: 'already_running', incidentId: result.incidentId });
    window.location.assign(operatorIncidentPath(result.incidentId));
  };
  return { state, start };
}
