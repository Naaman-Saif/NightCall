export type Route =
  | { page: 'list'; showSample: boolean }
  | { page: 'incident'; incidentId: string; isOperator: boolean; isSample: boolean };

const INCIDENT_PATH = /^\/(op\/)?incidents\/([^/]+)\/?$/;

export function readRoute(location: Location): Route {
  const isSample = new URLSearchParams(location.search).get('fixture') === 'sample';
  const match = INCIDENT_PATH.exec(location.pathname);
  if (!match) return { page: 'list', showSample: isSample };
  return { page: 'incident', incidentId: decodeURIComponent(match[2]), isOperator: Boolean(match[1]), isSample };
}
